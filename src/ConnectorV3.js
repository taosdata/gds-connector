
/**
 * requet client version
 */
 function getClientVersion(url, request) {

    var urlv3 = url
    // For TDengine cloud use cloud token to instead user/password
    if (request.configParams.CLOUD_TOKEN) {
        urlv3 = urlv3 + "?token=" + request.configParams.CLOUD_TOKEN
        var options = {
            method: 'POST',
            payload: "select client_version()",
        }
    } else {
        // normally taosAdapter for TDengine 3.0.0.0 or higher.
        var basic = 'Basic ' + Utilities.base64Encode(request.configParams.TD_USER + ':' + request.configParams.TD_PASSWORD);
        var options = {
            method: 'POST',
            payload: "select client_version()",
            headers: { 'Authorization': basic }
        }
    }

    var response = UrlFetchApp.fetch(urlv3, options);

    //Logger.log("GetClientVersion:" + response);
    
    if (response.getResponseCode() == 200) {
        var body = response.getContentText();
        if (JSON.parse(body).data[0][0].slice(0, 1)) {
            return JSON.parse(body).data[0][0].slice(0, 1);
        } else {
            throw Error("Get client version failed");
        }

    } else {
        throw Error("Get client version failed");
    }

}

/**
* send SQL request to TDengine Version higher (include) 3.0.0.0
*/
function doQUeryV3(url, body, request) {
    var cache = CacheService.getScriptCache()
    var urlv3 = url;

    Logger.log(JSON.stringify(body));

    // For TDengine cloud use clound token to instead user/password
    if (request.configParams.CLOUD_TOKEN) {
        urlv3 = urlv3 + "?token=" + request.configParams.CLOUD_TOKEN
        var options = {
            method: 'POST',
            payload: body,
        }
    } else {
        // normally taosAdapter for TDengine 3.0.0.0 or higher.
        var basic = 'Basic ' + Utilities.base64Encode(request.configParams.TD_USER + ':' + request.configParams.TD_PASSWORD);

        var options = {
            method: 'POST',
            payload: body,
            headers: { 'Authorization': basic }
        }
    }

    var response = UrlFetchApp.fetch(urlv3, options);
   // Logger.log("doQueryV3:" + response);
    if (response.getResponseCode() == 200) {
        var body = response.getContentText();
        var json = JSON.parse(body)
        if (json.code == 0) {
            return json;
        } else {
            throw Error("Fetch data from TDengine fail,reason:" + json.desc)
        }
    } else {
        throw Error("fetch reqest fail,code:" + response.getResponseCode());
    }
}