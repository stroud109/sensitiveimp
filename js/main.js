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

    var bucketSeries = function (name, series, allowedMisses, threshold) {
        // Let's us take a KeenIO series and bucket any point with value over threshold
        // by start time and end time of bucket. Use `misses` to control how many points
        // in a row must be below threshold to consider a bucket as 'ended'.
        var rows = [];

        var absStart = null;
        var absEnd = null;

        var activityStart = null;
        var activityEnd = null;

        _.each(series, function (point) {

            // If this point has recorded activity and we have been
            // in a period of lull, then start recording activity!
            if (!activityStart && point.value >= threshold) {
                misses = 0;
                activityStart = point.timeframe.start;
            }

            // If this point has a value, push the end time to this point's end time.
            if (point.value >= threshold)
                activityEnd = point.timeframe.end;

            // If we are recording activity, but we hit a point with no value,
            // then we uptick our miss count.
            if (activityStart && point.value < threshold)
                misses++;

            // If are recording activity and we have recorded more than allowedMisses,
            // save the current start and end times as a row and reset everything.
            if (activityStart && misses > allowedMisses) {
                rows.push([name, new Date(activityStart), new Date(activityEnd)]);
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
        var container2 = document.getElementById('chart_2');
        var container3 = document.getElementById('chart_3');
        var chart1 = new google.visualization.Timeline(container1);
        var chart2 = new google.visualization.Timeline(container2);
        var chart3 = new google.visualization.Timeline(container3);
        var dataTable1 = new google.visualization.DataTable();
        var dataTable2 = new google.visualization.DataTable();
        var dataTable3 = new google.visualization.DataTable();

        // Each data point on the chart should have three elements:
        dataTable1.addColumn({ type: 'string', id: 'Type' });
        dataTable1.addColumn({ type: 'date', id: 'Start' });
        dataTable1.addColumn({ type: 'date', id: 'End' });

        dataTable2.addColumn({ type: 'string', id: 'Type' });
        dataTable2.addColumn({ type: 'date', id: 'Start' });
        dataTable2.addColumn({ type: 'date', id: 'End' });

        dataTable3.addColumn({ type: 'string', id: 'Type' });
        dataTable3.addColumn({ type: 'date', id: 'Start' });
        dataTable3.addColumn({ type: 'date', id: 'End' });

        // Get the current date so we can make absolute timeframe requests
        var now = new Date();

        // Get activity for today
        var todayDeferred = $.Deferred();
        new Keen.Series("motion", {
            analysisType: "count",
            timeframe: {
                start: new Date(now.getTime() - (1 * 60 * 60 * 24 * 1000)).toISOString(),
                end: now.toISOString()
            },
            interval: "minutely",
            filters: [{"property_name": "type", "operator":"eq", "property_value": "start"}]
        })
        .getResponse(todayDeferred.resolve);

        // Get activity for yesterday
        var yesterdayDeferred = $.Deferred();
        var prev_1_days = new Keen.Series("motion", {
            analysisType: "count",
            timeframe: {
                start: new Date(now.getTime() - (2 * 60 * 60 * 24 * 1000)).toISOString(),
                end: new Date(now.getTime() - (1 * 60 * 60 * 24 * 1000)).toISOString()
            },
            interval: "minutely",
            filters: [{"property_name": "type", "operator":"eq", "property_value": "start"}]
        })
        .getResponse(yesterdayDeferred.resolve);

        // Get activity for day before yesterday
        var dayBeforeYesterdayDeferred = $.Deferred();
        new Keen.Series("motion", {
            analysisType: "count",
            timeframe: {
                start: new Date(now.getTime() - (3 * 60 * 60 * 24 * 1000)).toISOString(),
                end: new Date(now.getTime() - (2 * 60 * 60 * 24 * 1000)).toISOString()
            },
            interval: "minutely",
            filters: [{"property_name": "type", "operator":"eq", "property_value": "start"}]
        })
        .getResponse(dayBeforeYesterdayDeferred.resolve);

        // Wait for all three series to load before preparing the timeline
        $.when(todayDeferred, yesterdayDeferred, dayBeforeYesterdayDeferred).done(function (a, b, c) {
            dataTable1.addRows(bucketSeries('Past 24h', a.result, 10, 1));
            dataTable2.addRows(bucketSeries('day before', b.result, 10, 1));
            dataTable3.addRows(bucketSeries('day before that', c.result, 10, 1));

            chart1.draw(dataTable1, {
                timeline: { singleColor: '#E84A86' }
            });
            chart2.draw(dataTable2, {
                timeline: { singleColor: '#FE3842' }
            });
            chart3.draw(dataTable3, {
                timeline: { singleColor: '#FF724A' }
            });
        });
    });

})(window);
