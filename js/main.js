/*
    - Notes on the metadata -

    Should have logged the day, hour, and minute of each 'start' event
    as separate metadata. That would have allowed me to group by these
    three fields instead of having to normalize in the javascript (also
    could have made just a single query).

    {
        type: 'start',
        day_of_year: 140,
        hour: 11,
        minute: 50
    }

*/


(function (win) {
    'use static';

    var normalizeDate = function (date) {
        date = new Date (date);
        date.setFullYear(2014);
        date.setMonth(4);
        date.setDate(21);
        return date;
    };

    var bucketSeries = function (name, series, allowedMisses, threshold) {
        // Let's us take a KeenIO series and bucket any point with value over threshold
        // by start time and end time of bucket. Use `misses` to control how many points
        // in a row must be below threshold to consider a bucket as 'ended'.
        var rows = [];

        var absoluteStart = null;

        var activityStart = null;
        var activityEnd = null;

        _.each(series, function (point) {

            // Initializing the start time we'll be working with.
            if (!absoluteStart) {
                absoluteStart = normalizeDate(point.timeframe.start);
            }

            // If this point has recorded activity and we have been
            // in a period of lull, then start recording activity!
            if (!activityStart && point.value >= threshold) {
                misses = 0;
                activityStart = normalizeDate(point.timeframe.start);
            }

            // If this point has a value, push the end time to this point's end time.
            if (point.value >= threshold)
                activityEnd = normalizeDate(point.timeframe.end);

            // If we are recording activity, but we hit a point with no value,
            // then we uptick our miss count.
            if (activityStart && point.value < threshold)
                misses++;

            // If we're recording activity and we have recorded more than allowedMisses,
            // save the current start and end times as a colored block of data and reset
            // everything.
            if (activityStart && misses > allowedMisses) {
                if (activityStart > activityEnd) {
                    activityEnd.setHours(23)
                    activityEnd.setMinutes(59)
                }
                rows.push([name, activityStart, activityEnd]);
                activityStart = null;
                activityEnd = null;
                misses = 0;
            }
        });

        // rows.push(['Timeframe', new Date(_.first(series).timeframe.start), new Date(_.last(series).timeframe.end)]);

        return rows;

    };

    var createActivityTimelineChart = function (elementId, timeframe) {

    };

    // Use deferreds to wait for Google and KeenIO SDKs to
    // both report that they have successfully loaded.
    var keenDeferred = $.Deferred();
    var googleDeferred = $.Deferred();

    Keen.onChartsReady(keenDeferred.resolve);
    google.setOnLoadCallback(googleDeferred.resolve);

    $.when(keenDeferred, googleDeferred).done(function () {

        // Prepare a timeline chart type from google
        // https://google-developers.appspot.com/chart/interactive/docs/gallery/timeline
        var container1 = document.getElementById('chart_1');
        var chart = new google.visualization.Timeline(container1);

        win.drawChart = function () {

            var dataTable = new google.visualization.DataTable();

            // Each data point on the chart should have three elements:
            dataTable.addColumn({ type: 'string', id: 'Type' });
            dataTable.addColumn({ type: 'date', id: 'Start' });
            dataTable.addColumn({ type: 'date', id: 'End' });

            // Get the current date so we can make absolute timeframe requests
            var now = new Date();
            now.setHours(0);

            var msPerDay = 60 * 60 * 24 * 1000;

            console.log(now.toISOString())

            // Get activity for a given day
            var fetchDayData = function(rangeEnd) {
                var dayDeferred = $.Deferred();
                new Keen.Series("motion", {
                    analysisType: "count",
                    timeframe: {
                        start: new Date(now.getTime() - ((rangeEnd + 1) * msPerDay)).toISOString(),
                        end: new Date(now.getTime() - (rangeEnd * msPerDay)).toISOString()
                    },
                    interval: "minutely",
                    filters: [{"property_name": "type", "operator":"eq", "property_value": "start"}]
                })
                .getResponse(dayDeferred.resolve);
                return dayDeferred;
            };

            var deferreds = _.map(_.range(7), fetchDayData);
            console.log(deferreds);

            // Wait for all three series to load before preparing the timeline
            $.when.apply(win, deferreds).done(function (a, b, c, d, e, f, g) {
                dataTable.addRows(bucketSeries('today', a.result, 10, 1));
                dataTable.addRows(bucketSeries('yesterday', b.result, 10, 1));
                dataTable.addRows(bucketSeries('3 day ago', c.result, 10, 1));
                dataTable.addRows(bucketSeries('4 days ago', d.result, 10, 1));
                dataTable.addRows(bucketSeries('5 days ago', e.result, 10, 1));
                dataTable.addRows(bucketSeries('6 days ago', f.result, 10, 1));
                dataTable.addRows(bucketSeries('7 days ago', g.result, 10, 1));

                chart.clearChart();
                chart.draw(dataTable, {
                    timeline: { colorByRowLabel: true },
                });
            });
        };
        setInterval(win.drawChart, 5 * 60 * 1000);
        win.drawChart();
    });

})(window);
