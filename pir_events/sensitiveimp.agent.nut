server.log("hello from the agent!");

class KeenIO {
    _baseUrl = "https://api.keen.io/3.0/projects/";

    _projectId = null;
    _apiKey = null;

    constructor(projectId, apiKey) {
        _projectId = projectId;
        _apiKey = apiKey;
    }

    /***************************************************************************
    * Parameters:
    *   eventCollection - the name of the collection you are pushing data to
    *   data - the data you are pushing
    *   cb - an optional callback to execute upon completion
    *
    * Returns:
    *   HTTPResponse - if a callback was NOT specified
    *   None - if a callback was specified
    ***************************************************************************/
    function sendEvent(eventCollection, data, cb = null) {
        local url = _buildUrl(eventCollection);
        local headers = {
            "Content-Type": "application/json"
        };
        local encodedData = http.jsonencode(data);
        server.log(encodedData);

        local request = http.post(url, headers, encodedData);

        // if a callback was specificed
        if (cb == null) {
            return request.sendsync();
        } else {
            request.sendasync(cb);
        }
    }

    /*************** Private Functions - (DO NOT CALL EXTERNALLY) ***************/
    function _buildUrl(eventCollection, projectId = null, apiKey = null) {
        if (projectId == null) projectId = _projectId;
        if (apiKey == null) apiKey = _apiKey;


        local url = _baseUrl + projectId + "/events/" + eventCollection + "?api_key=" + apiKey;
        return url;
    }
}

/**************************** Begin KeenIO logging here *************************/

const KEEN_PROJECT_ID = "5374e56f73f4bb065b000005";
const KEEN_WRITE_API_KEY = "8f2ae9799982e19df2a94d64f6ad2126e2243adb1202a4e48e26c559135d37e0da98bd18547ed16b280f435ae2e880fe72993837113a26b43f349c9d604b80816e5a2954e5c5a60205f8166720bfdc07e7e12215998a11444cd52ba92c40ef8e05e54a48127e04811fc9a704be49af3a";

keen <- KeenIO(KEEN_PROJECT_ID, KEEN_WRITE_API_KEY);
device.on("motion", function(state) {

    local eventData = {
        type = state ? "start" : "end"
    };

    // send an event sycronously
    local result = keen.sendEvent("motion", eventData);
    server.log(result.statuscode + ": " + result.body);
});
