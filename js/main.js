(function (win) {
    'use strict';

    var bucketSeries = function (series, allowedMisses, threshold) {
        // Let's take a KeenIO series and bucket any point with value over a threshold,
        // determined by start time and end time of bucket. Use `misses` to control how
        // many points in a row must be below a threshold to consider a bucket as 'ended'.
        var buckets = [];
        var activityStart = null;
        var activityEnd = null;
        var misses = 0;

        _.each(series, function (point) {

            // If this point has recorded activity and we have been
            // in a period of lull, then start recording activity.
            if (!activityStart && point.value >= threshold) {
                misses = 0;
                activityStart = point.timeframe.start;
            }

            // If this point has a value, push the `timeframe.end` to this point's end time.
            if (point.value >= threshold)
                activityEnd = point.timeframe.end;

            // If we are recording activity, but we hit a point with no value,
            // then we uptick our miss count.
            if (activityStart && point.value < threshold)
                misses++;

            // If we're recording activity and we have recorded more than allowedMisses,
            // save the current start and end times as a colored block of data and reset
            // everything.
            if (activityStart && misses > allowedMisses) {
                buckets.push({start: new Date(activityStart), end: new Date(activityEnd)});
                activityStart = null;
                activityEnd = null;
                misses = 0;
            }
        });

        // If we started an activity block but didn't get the chance to add it to `buckets`,
        // then we add it here.
        if (activityStart && activityEnd) {
            buckets.push({start: new Date(activityStart), end: new Date(activityEnd)});
        }

        return buckets;

    };

    // Use deferreds to wait for Google and Keen IO SDKs to
    // both report that they have successfully loaded.
    var keenDeferred = $.Deferred();
    var googleDeferred = $.Deferred();

    Keen.onChartsReady(keenDeferred.resolve);
    google.setOnLoadCallback(googleDeferred.resolve);

    $.when(keenDeferred, googleDeferred).done(function () {

        // Prepare a timeline chart type from google
        // https://google-developers.appspot.com/chart/interactive/docs/gallery/timeline
        var container = document.getElementById('chart');
        var chart = new google.visualization.Timeline(container);

        win.drawChart = function () {

            var dataTable = new google.visualization.DataTable();

            // Each data point on the chart should have three elements:
            dataTable.addColumn({ type: 'string', id: 'Type' });
            dataTable.addColumn({ type: 'date', id: 'Start' });
            dataTable.addColumn({ type: 'date', id: 'End' });

            // Define the start date so we can make absolute timeframe requests.
            // In this case, I've used June 3rd 2014, and I've converted it to ISO time.
            // I multiply the ISO time by 1000 because ISO is in seconds, and JavaScript
            // uses milliseconds.
            var now = new Date(1401778800 * 1000);

            // To get the current date, update `now` so it looks like this:
            // var now = new Date();
            var msPerDay = 60 * 60 * 24 * 1000;

            // Get activity for a given timeframe, from Keen IO.
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

            // We're collecting data for 2 weeks, aka 14 days.
            var deferreds = _.map(_.range(14), fetchDayData);

            // Wait for all the series to load before preparing the timeline.
            $.when.apply(win, deferreds).done(function () {

                // We want to group all our data in a single array, and
                // we want all of our data to go from smallest to greatest.
                var all = _.flatten(_.pluck(Array.prototype.reverse.call(arguments), 'result'));

                // Now we want to seperate the data into rows.
                var format = d3.time.format("%m/%d");

                // We want to group the data into rows starting at 5pm one day
                // and ending at 4:59pm the next day. 17 is 5pm in JS (and military time).
                // Right now this part has been disabled because of a pesky bug.
                var getGroupKey = function (point) {
                    var date = new Date(point.timeframe.start);
                    // var dateEnd = new Date(point.timeframe.end);
                    // if (date.getHours() > dateEnd.getHours())
                    //     date = dateEnd;
                    //
                    //     TODO: debug issue that causes the last day (in some cases) to split
                    //     the row out into two days (36h period)
                    //
                    // if (date.getHours() < 17) {
                    //     // date = new Date(date.getTime() - msPerDay);
                    //     date = new Date(date.getTime() - msPerDay);
                    // }
                    //
                    // var nextDate = new Date(date.getTime() + msPerDay);
                    // return format(date) + '-' + format(nextDate);
                    return format(date);
                };

                var nest = d3.nest().key(getGroupKey).entries(all);

                // Strip the data of year and month, and only specify whether a data
                // point on a given row belongs to day 1 or 2.
                var normalizeDate = function (date, cutOff) {
                    if (date >= cutOff) {
                        date.setDate(2);
                    }
                    else {
                        date.setDate(1);
                    }
                    date.setYear(0);
                    date.setMonth(0);
                    return date;
                };

                // Display the rows starting with the most recent date.
                _.each(nest.reverse(), function (leaf) {

                    // Use 12am as the cutoff date to specify day 1 or day 2 in a given row.
                    var midnight = new Date(_.first(leaf.values).timeframe.start);
                    midnight.setHours(24, 0);

                    console.log(leaf.key, midnight);
                    console.log(leaf.values);

                    // Bucket each row's data.
                    var buckets = bucketSeries(leaf.values, 10, 1);

                    // Finally, generate data to add to the Google timeline chart.
                    var rows = _.map(buckets, function (bucket) {
                        var startDate = new Date(bucket.start);
                        var endDate = new Date(bucket.end);
                        return [
                            leaf.key,
                            normalizeDate(startDate, midnight),
                            normalizeDate(endDate, midnight)
                        ];
                    });
                    dataTable.addRows(rows);
                });

                // Clear the chart before drawing a new set of data on the chart.
                chart.clearChart();
                chart.draw(dataTable, {
                    timeline: { colorByRowLabel: true },
                });
            });
        };

        // Fetch new data every 5 minutes.
        setInterval(win.drawChart, 5 * 60 * 1000);
        win.drawChart();
    });

})(window);
