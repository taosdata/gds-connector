var cc = DataStudioApp.createCommunityConnector();

function getAuthType() {
    var AuthTypes = cc.AuthType;
    return cc
        .newAuthTypeResponse()
        .setAuthType(AuthTypes.NONE)
        .build();
}

function isAdminUser() {
    return true
}

function getConfig(request) {
    var config = cc.getConfig();

    config.newInfo()
        .setId('TDengine')
        .setText('TDengine plugin');

    config.newTextInput()
        .setId('TD_URL')
        .setName('Enter URL')
        .setHelpText('e.g. http://127.0.0.1:6041')
        .setPlaceholder('http://hostname:port');

    config.newTextInput()
        .setId('TD_USER')
        .setName('Enter username')
        .setHelpText('e.g. root')
        .setPlaceholder('root');

    config.newTextInput()
        .setId('TD_PASSWORD')
        .setName('Enter passwrod')
        .setHelpText('e.g. connect to tdengine2')
        .setPlaceholder('taosdata');

    config.newTextInput()
        .setId('TD_DATABASE')
        .setName('Enter database')
        .setHelpText('e.g. log')

    config.newTextInput()
        .setId('TD_TABLE')
        .setName('Enter table')
        .setHelpText('e.g. logs')

    config.newTextInput()
        .setId('TD_START_TIME')
        .setName('Enter query range start time')
        .setHelpText('e.g. 2020-04-21 20:53:00')

    config.newTextInput()
        .setId('TD_END_TIME')
        .setName('Enter query range end time')
        .setHelpText('e.g. 2020-04-21 20:53:00')


    config.setDateRangeRequired(true);

    return config.build();
}


function getFields(request, cached) {
    if(request.configParams.TD_URL==undefined){
      throw new Error("URL should not be empty"+request.configParams.TD_URL);
    }
    if(request.configParams.TD_USER==undefined){
      throw new Error("username should not be empty");
    }
    if(request.configParams.TD_PASSWORD==undefined){
      throw new Error("passoword should not be empty");
    }
    if(request.configParams.TD_DATABASE==undefined){
      throw new Error("database should not be empty");
    }
    if(request.configParams.TD_TABLE==undefined){
      throw new Error("table should not be empty")
    }
    var cache = CacheService.getScriptCache()
    var cacheKey = [
        request.configParams.TD_URL,
        request.configParams.TD_DATABASE,
        request.configParams.TD_TABLE,
    ].join('#')
    if (cached) {
        var cachedSchema = JSON.parse(cache.get(cacheKey))
        if (cachedSchema !== null) {
            Logger.log(
                'Use cached schema for key: %s, schema: %s',
                cacheKey,
                cachedSchema
            )
            return cachedSchema
        }
    }
 
    try{
        var responseJson=doQUery(request.configParams.TD_URL + '/rest/sqlutc/' + request.configParams.TD_DATABASE, 'describe ' + request.configParams.TD_TABLE,request)
         }catch(e){
      throwConnectorError(e.message,true);
    }
      var fields = cc.getFields();
      var types = cc.FieldType;
      for (var i in responseJson.data) {
          d = responseJson.data[i]
          var name = d[0]
          var fieldType = d[1]
          var colType = d[3]
          if (colType === "TAG" || fieldType === 9) {
              fields.newDimension().setId(name).setName(name).setType(getType(fieldType, types))
          } else {
              fields.newMetric().setId(name).setName(name).setType(getType(fieldType, types))
          }
      }
   
    
    var cacheValue = JSON.stringify(fields.build())
    Logger.log(
        'Store cached schema for key: %s, schema: %s',
        cacheKey,
        cacheValue
    )
    cache.put(cacheKey, cacheValue)
    return fields.build();
}

function getSchema(request) {
 try{
    fields = getFields(request, false)
     }catch(e){
   throwConnectorError(e.message,true);
 }
    return { 'schema': fields };

   
}

function getType(fieldType, types) {
    switch (fieldType) {
        case 'BOOL':
            return types.BOOLEAN
        case "TINYINT":
        case 'FLOAT':
        case "SMALLINT":
        case "INT":
        case "BIGINT":
        case "DOUBLE":
        case "TINYINT UNSIGNED":
        case "SMALLINT UNSIGNED":
        case "INT UNSIGNED":
        case "BIGINT UNSIGNED":
            return types.NUMBER
        case "BINARY":
        case "NCHAR":
        case "JSON":
            return types.TEXT
        case "TIMESTAMP":
            return types.YEAR_MONTH_DAY_SECOND
        default:
            return types.TEXT
    }
}

function getData(request) {
    var timeRange = ""
 try {
    if (request.configParams.TD_START_TIME && request.configParams.TD_END_TIME) {
        var start = new Date(request.configParams.TD_START_TIME).toISOString()
        var end = new Date(request.configParams.TD_END_TIME).toISOString()
        timeRange = " where ts >= '" + start + "'and ts <='" + end + "'"
    } else {
        var haveStart = false
        var haveEnd = false
        if (request.dateRange && request.dateRange.startDate) {
            haveStart = true
            var start = new Date(request.dateRange.startDate).toISOString()
        }
        if (request.dateRange && request.dateRange.endDate) {
            haveEnd = true
            var end = new Date(request.dateRange.endDate).toISOString()
        }
        if (haveStart || haveEnd) {
            if (haveStart && haveEnd) {
                timeRange = " where ts >= '" + start + "'and ts <='" + end + "'"
            } else if (haveStart) {
                timeRange = " where ts >= '" + start + "'"
            } else {
                timeRange = " where ts <= '" + end + "'"
            }
        }
    }

    var names = request.fields.map(function (field) { return field.name })
    var allFields = getFields(request, true)
    var allMap = {}
    var fieldsFiltered = []
    for (var field of allFields) {
        allMap[field.name] = field
    }
    for (var name of names) {
        field = allMap[name]
        if (field) {
            fieldsFiltered.push(field)
        }
    }
    var nameStr = names.join(',')
    
    var json = doQUery(request.configParams.TD_URL + '/rest/sqlutc/' + request.configParams.TD_DATABASE, "select " + nameStr + " from " + request.configParams.TD_TABLE + timeRange + " limit 1000000",request)
//    Logger.log("[response]:"+resp)
//    var body = resp.getContentText();
//    var json = JSON.parse(body)
    var rows = []
    var types = cc.FieldType;
   
        for (var i in json.data) {
            var d = []
            for (var j = 0; j < fieldsFiltered.length; j++) {
                if (fieldsFiltered[j].dataType == types.BOOLEAN) {
                    d.push(!!json.data[i][j])
                } else if (fieldsFiltered[j].semantics && fieldsFiltered[j].semantics.semanticType && fieldsFiltered[j].semantics.semanticType == types.YEAR_MONTH_DAY_SECOND) {
                    var date = new Date(json.data[i][j])
                    d.push(date.getUTCFullYear() +
                        ('0' + (date.getUTCMonth() + 1)).slice(-2) +
                        ('0' + date.getUTCDate()).slice(-2) +
                        ('0' + date.getUTCHours()).slice(-2) +
                        ('0' + date.getUTCMinutes()).slice(-2) +
                        ('0' + date.getUTCSeconds()).slice(-2))
                } else {
                    d.push(json.data[i][j])
                }
            }
            rows.push({ values: d })
        }
    } catch (e) {
        Logger.log(e)
    }
    ret = {
        schema: fieldsFiltered,
        rows: rows,
        filtersApplied: false,
    }
    return ret
}

function doQUery(url, body, request) {
    var cache = CacheService.getScriptCache()
    var basic = 'Basic '+Utilities.base64Encode(request.configParams.TD_USER + ':' + request.configParams.TD_PASSWORD);
    Logger.log(JSON.stringify(body));
    var options = {
        method: 'POST',
        payload: body,
        headers: { 'Authorization': basic }
    }
//    Logger.log(url);
//    Logger.log(options);

    var response = UrlFetchApp.fetch(url, options);
    Logger.log("doQuery:"+response);
    if(response.getResponseCode() == 200){
      var body = response.getContentText();
      var json = JSON.parse(body)
       if(json.status=='succ'){
          return json;
          if(json.rows==0){
          throw Error("No data is available for the requested time period")
          }
       }else{
         throw Error("Fetch data from TDengine fail,reason:"+json.desc)
       }
    }else{
      throw Error("fetch reqest fail,code:"+response.getResponseCode());
    }
  
}

/**
 * Throws an error that complies with the community connector spec.
 * @param {string} message The error message.
 * @param {boolean} userSafe Determines whether this message is safe to show
 *     to non-admin users of the connector. true to show the message, false
 *     otherwise. false by default.
 */
function throwConnectorError(message, userSafe) {
  userSafe = (typeof userSafe !== 'undefined' &&
              typeof userSafe === 'boolean') ? userSafe : false;
  if (userSafe) {
    message = 'DS_USER:' + message;
  }

  throw new Error(message);
}