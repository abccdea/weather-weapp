/**
 * WeChat Mini Program JavaScriptSDK
 * 
 * @version 1.0
 * @date 2017-01-10
 * @author jaysonzhou@tencent.com
 */

var ERROR_CONF = {
    KEY_ERR: 311,
    KEY_ERR_MSG: 'Key format error',
    PARAM_ERR: 310,
    PARAM_ERR_MSG: 'Request parameter information is incorrect',
    SYSTEM_ERR: 600,
    SYSTEM_ERR_MSG: 'system error',
    WX_ERR_CODE: 1000,
    WX_OK_CODE: 200
};
var BASE_URL = 'https://apis.map.qq.com/ws/';
var URL_SEARCH = BASE_URL + 'place/v1/search';
var URL_SUGGESTION = BASE_URL + 'place/v1/suggestion';
var URL_GET_GEOCODER = BASE_URL + 'geocoder/v1/';
var URL_CITY_LIST = BASE_URL + 'district/v1/list';
var URL_AREA_LIST = BASE_URL + 'district/v1/getchildren';
var URL_DISTANCE = BASE_URL + 'distance/v1/';
var Utils = {
    /**
     * Get the end of the query string
     * @param {Array|String} retrieve data
     */
    location2query(data) {
        if (typeof data == 'string') {
            return data;
        }
        var query = '';
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
            if (!!query) {
                query += ';';
            }
            if (d.location) {
                query = query + d.location.lat + ',' + d.location.lng;
            }
            if (d.latitude && d.longitude) {
                query = query + d.latitude + ',' + d.longitude;
            }
        }
        return query;
    },

    /**
     * Use the WeChat API for positioning
     */
    getWXLocation(success, fail, complete) {
        wx.getLocation({
            type: 'gcj02',
            success: success,
            fail: fail,
            complete: complete
        });
    },

    /**
     * Get the location parameter
     */
    getLocationParam(location) {
        if (typeof location == 'string') {
            var locationArr = location.split(',');
            if (locationArr.length === 2) {
                location = {
                    latitude: location.split(',')[0],
                    longitude: location.split(',')[1]
                };
            } else {
                location = {};
            }
        }
        return location;
    },

    /**
     * Callback function default processing
     */
    polyfillParam(param) {
        param.success = param.success || function () { };
        param.fail = param.fail || function () { };
        param.complete = param.complete || function () { };
    },

    /**
     * Verify that the key value corresponding to param is empty or not.
     * 
     * @param {Object} param API parameter
     * @param {String} key Key to the corresponding parameter
     */
    checkParamKeyEmpty(param, key) {
        if (!param[key]) {
            var errconf = this.buildErrorConfig(ERROR_CONF.PARAM_ERR, ERROR_CONF.PARAM_ERR_MSG + key +'Incorrect parameter format');
            param.fail(errconf);
            param.complete(errconf);
            return true;
        }
        return false;
    },

    /**
     * Verify that there is a search term keyword in the parameter
     * 
     * @param {Object} param API parameter
     */
    checkKeyword(param){
        return !this.checkParamKeyEmpty(param, 'keyword');
    },

    /**
     * Verify location value
     * 
     * @param {Object} param API parameter
     */
    checkLocation(param) {
        var location = this.getLocationParam(param.location);
        if (!location || !location.latitude || !location.longitude) {
            var errconf = this.buildErrorConfig(ERROR_CONF.PARAM_ERR, ERROR_CONF.PARAM_ERR_MSG + ' location parameter is in the wrong format')
            param.fail(errconf);
            param.complete(errconf);
            return false;
        }
        return true;
    },

    /**
     * Constructing an error data structure
     * @param {Number} errCode error code
     * @param {Number} errMsg error message
     */
    buildErrorConfig(errCode, errMsg) {
        return {
            status: errCode,
            message: errMsg
        };
    },

    /**
     * Construct WeChat request parameters, public property processing
     * 
     * @param {Object} param API parameter
     * @param {Object} param options
     */
    buildWxRequestConfig(param, options) {
        var that = this;
        options.header = { "content-type": "application/json" };
        options.method = 'GET';
        options.success = function (res) {
            var data = res.data;
            if (data.status === 0) {
                param.success(data);
            } else {
                param.fail(data);
            }
        };
        options.fail = function (res) {
            res.statusCode = ERROR_CONF.WX_ERR_CODE;
            param.fail(that.buildErrorConfig(ERROR_CONF.WX_ERR_CODE, result.errMsg));
        };
        options.complete = function (res) {
            var statusCode = +res.statusCode;
            switch(statusCode) {
                case ERROR_CONF.WX_ERR_CODE: {
                    param.complete(that.buildErrorConfig(ERROR_CONF.WX_ERR_CODE, res.errMsg));
                    break;
                }
                case ERROR_CONF.WX_OK_CODE: {
                    var data = res.data;
                    if (data.status === 0) {
                        param.complete(data);
                    } else {
                        param.complete(that.buildErrorConfig(data.status, data.message));
                    }
                    break;
                }
                default:{
                    param.complete(that.buildErrorConfig(ERROR_CONF.SYSTEM_ERR, ERROR_CONF.SYSTEM_ERR_MSG));
                }

            }
        }
        return options;
    },

    /**
     * Handling whether user parameters are passed in coordinates for different processing
     */
    locationProcess(param, locationsuccess, locationfail, locationcomplete) {
        var that = this;
        locationfail = locationfail || function (res) {
            res.statusCode = ERROR_CONF.WX_ERR_CODE;
            param.fail(that.buildErrorConfig(ERROR_CONF.WX_ERR_CODE, res.errMsg));
        };
        locationcomplete = locationcomplete || function (res) {
            if (res.statusCode == ERROR_CONF.WX_ERR_CODE) {
                param.complete(that.buildErrorConfig(ERROR_CONF.WX_ERR_CODE, res.errMsg));
            }
        };
        if (!param.location) {
            that.getWXLocation(locationsuccess, locationfail, locationcomplete);
        } else if (that.checkLocation(param)) {
            var location = Utils.getLocationParam(param.location);
            locationsuccess(location);
        }
    }
}


class QQMapWX {

    /**
     * constructor function
     * 
     * @param {Object} options API parameter,key is required
     */
    constructor(options) {
        if (!options.key) {
            throw Error('key value cannot be null');
        }
        this.key = options.key;
    }

    /**
     * POI nearby search
     *
     * @param {Object} options api parameter object
     * 
     * Parameter object structure can refer to
     * @see http://lbs.qq.com/webservice_v1/guide-search.html
     */
    search(options) {
        var that = this;
        options = options || {};

        Utils.polyfillParam(options);

        if (!Utils.checkKeyword(options)) {
            return;
        }

        var requestParam = {
            keyword: options.keyword,
            orderby: options.orderby || '_distance',
            page_size: options.page_size || 10,
            page_index: options.page_index || 1,
            output: 'json',
            key: that.key
        };

        if (options.address_format) {
            requestParam.address_format = options.address_format;
        }

        if (options.filter) {
            requestParam.filter = options.filter;
        }

        var distance = options.distance || "1000";
        var auto_extend = options.auto_extend || 1;

        var locationsuccess = function (result) {
            requestParam.boundary = "nearby(" + result.latitude + "," + result.longitude + "," + distance + "," + auto_extend +")";
            wx.request(Utils.buildWxRequestConfig(options, {
                url: URL_SEARCH,
                data: requestParam
            }));
        }
        Utils.locationProcess(options, locationsuccess);
    }

    /**
     * sug fuzz search
     *
     * @param {Object} options api parameter object
     * 
     * Parameter object structure can refer to
     * http://lbs.qq.com/webservice_v1/guide-suggestion.html
     */
    getSuggestion(options) {
        var that = this;
        options = options || {};
        Utils.polyfillParam(options);

        if (!Utils.checkKeyword(options)) {
            return;
        }

        var requestParam = {
            keyword: options.keyword,
            region: options.region || '全国',
            region_fix: options.region_fix || 0,
            policy: options.policy || 0,
            output: 'json',
            key: that.key
        };
        wx.request(Utils.buildWxRequestConfig(options, {
            url: URL_SUGGESTION,
            data: requestParam
        }));
    }

    /**
     * Reverse address resolution
     *
     * @param {Object} options api parameter object
     * 
     * Parameter object structure can refer to
     * http://lbs.qq.com/webservice_v1/guide-gcoder.html
     */
    reverseGeocoder(options) {
        var that = this;
        options = options || {};
        Utils.polyfillParam(options);
        var requestParam = {
            coord_type: options.coord_type || 5,
            get_poi: options.get_poi || 0,
            output: 'json',
            key: that.key
        };
        if (options.poi_options) {
            requestParam.poi_options = options.poi_options
        }

        var locationsuccess = function (result) {
            requestParam.location = result.latitude + ',' + result.longitude;
            wx.request(Utils.buildWxRequestConfig(options, {
                url: URL_GET_GEOCODER,
                data: requestParam
            }));
        };
        Utils.locationProcess(options, locationsuccess);
    }

    /**
     * Address resolution
     *
     * @param {Object} options api parameter object
     * 
     * Parameter object structure can refer to
     * http://lbs.qq.com/webservice_v1/guide-geocoder.html
     */
    geocoder(options) {
        var that = this;
        options = options || {};
        Utils.polyfillParam(options);

        if (Utils.checkParamKeyEmpty(options, 'address')) {
            return;
        }

        var requestParam = {
            address: options.address,
            output: 'json',
            key: that.key
        };

        wx.request(Utils.buildWxRequestConfig(options, {
            url: URL_GET_GEOCODER,
            data: requestParam
        }));
    }


    /**
     * Get city list
     *
     * @param {Object} options api parameter object
     * 
     * Parameter object structure can refer to
     * http://lbs.qq.com/webservice_v1/guide-region.html
     */
    getCityList(options) {
        var that = this;
        options = options || {};
        Utils.polyfillParam(options);
        var requestParam = {
            output: 'json',
            key: that.key
        };

        wx.request(Utils.buildWxRequestConfig(options, {
            url: URL_CITY_LIST,
            data: requestParam
        }));
    }

    /**
     * Get the list of districts and cities corresponding to the city ID
     *
     * @param {Object} options api parameter object
     * 
     * Parameter object structure can refer to
     * http://lbs.qq.com/webservice_v1/guide-region.html
     */
    getDistrictByCityId(options) {
        var that = this;
        options = options || {};
        Utils.polyfillParam(options);

        if (Utils.checkParamKeyEmpty(options, 'id')) {
            return;
        }

        var requestParam = {
            id: options.id || '',
            output: 'json',
            key: that.key
        };

        wx.request(Utils.buildWxRequestConfig(options, {
            url: URL_AREA_LIST,
            data: requestParam
        }));
    }

    /**
     * Route distance (non-linear distance) calculation for single-start to multi-end:
     * Two distance calculation methods are supported: walking and driving.
     * The maximum limit of the starting point to the end point is 10 kilometers.
     *
     * @param {Object} options api parameter object
     * 
     * Parameter object structure can refer to
     * http://lbs.qq.com/webservice_v1/guide-distance.html
     */
    calculateDistance(options) {
        var that = this;
        options = options || {};
        Utils.polyfillParam(options);

        if (Utils.checkParamKeyEmpty(options, 'to')) {
            return;
        }

        var requestParam = {
            mode: options.mode || 'walking',
            to: Utils.location2query(options.to),
            output: 'json',
            key: that.key
        };

        var locationsuccess = function (result) {
            requestParam.from = result.latitude + ',' + result.longitude;
            wx.request(Utils.buildWxRequestConfig(options, {
                url: URL_DISTANCE,
                data: requestParam
            }));
        }
        if (options.from) {
            options.location = options.from;
        }
        
        Utils.locationProcess(options, locationsuccess);
    }
}

module.exports = QQMapWX;