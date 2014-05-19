// Log a "hello world" statement to make sure you're online.
// This should show up in the Imp IDE logs.
server.log("hello from the agent!");

/*****************************************************************************
For more information on how to connect your event data to KeenIO, check out
 https://github.com/electricimp/reference/tree/master/webservices/keenio
 *****************************************************************************/

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

const KEEN_PROJECT_ID = "FILL THIS IN";
const KEEN_WRITE_API_KEY = "FILL THIS IN";

keen <- KeenIO(KEEN_PROJECT_ID, KEEN_WRITE_API_KEY);
device.on("motion", function(state) {

    local eventData = {
        type = state ? "start" : "end"
    };

    // send an event sycronously
    local result = keen.sendEvent("motion", eventData);
    server.log(result.statuscode + ": " + result.body);
});
