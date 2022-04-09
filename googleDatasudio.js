var cc = DataStudioApp.createCommunityConnector();

function getAuthType() {
    var AuthTypes = cc.AuthType;
    return cc
        .newAuthTypeResponse()
        .setAuthType(AuthTypes.NONE)
        .build();
}

function isAdminUser() {
    return false
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

    config.setDateRangeRequired(true);

    return config.build();
}


function getFields(request, cached) {
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
    var resp = doQUery(request.configParams.TD_URL + '/rest/sqlutc/' + request.configParams.TD_DATABASE, 'describe ' + request.configParams.TD_TABLE, request)
    var body = resp.getContentText();
    var json = JSON.parse(body)
    var fields = cc.getFields();
    var types = cc.FieldType;
    for (var i in json.data) {
        d = json.data[i]
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
    fields = getFields(request, false)
    return { 'schema': fields };
}

function getType(fieldType, types) {
    Logger.log(typeof fieldType);
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
            Logger.log(fieldType);
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
    var start = new Date(request.dateRange.startDate).toISOString()
    var end = new Date(request.dateRange.endDate).toISOString()
    var names = request.fields.map(function (field) { return field.name })
    var allFields = getFields(request, true)
    var allMap = {}
    var fieldsFiltered = []
    for (var field of allFields) {
        allMap[field.name] = field
    }
    Logger.log(allMap)
    for (var name of names) {
        field = allMap[name]
        if (field) {
            fieldsFiltered.push(field)
        }
    }
    Logger.log(fieldsFiltered)
    var nameStr = names.join(',')
    var resp = doQUery(request.configParams.TD_URL + '/rest/sqlutc/' + request.configParams.TD_DATABASE, "select " + nameStr + " from " + request.configParams.TD_TABLE + " where ts >= '" + start + "'and ts <='" + end + "'", request)
    // var resp = doQUery(request.configParams.TD_URL + '/rest/sqlutc/' + request.configParams.TD_DATABASE, "select " + nameStr + " from " + request.configParams.TD_TABLE,request)
    var body = resp.getContentText();
    var json = JSON.parse(body)
    var rows = []
    var types = cc.FieldType;
    try {
        for (var i in json.data) {
            var d = []
            for (var j = 0; j < fieldsFiltered.length; j++) {
                Logger.log("fieldsFiltered[j].dataType" + fieldsFiltered[j].dataType);
                Logger.log("types.YEAR_MONTH_DAY_SECOND" + types.YEAR_MONTH_DAY_SECOND);
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
            Logger.log(d)
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
    Logger.log(JSON.stringify(ret))
    return ret
}

function doQUery(url, body, request) {
    var cache = CacheService.getScriptCache()
    var basic = Utilities.base64Encode(request.configParams.TD_USER + ':' + request.configParams.TD_PASSWORD);
    var options = {
        method: 'POST',
        payload: body,
        headers: { 'Authorization': 'Basic ' + basic }
    }
    Logger.log(url);
    Logger.log(options);
    var response = UrlFetchApp.fetch(url, options);
    return response
}
