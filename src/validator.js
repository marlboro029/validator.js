var regexs = {
    rule:/^(.+?)\((.+)\)$/,     // 匹配 max_length(12)
    numericRegex:/^[0-9]+$/,    // 数字
    email:/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    ip:/^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})$/i
}

var _testHook = {
    // 验证合法邮箱
    is_emil: function(field){
        return regexs.email.test(field.value);
    },
    // 验证合法 ip 地址
    is_ip: function(value){return regexs.ip.test(value);},
    // 是否为必填
    required: function(field) {
        var value = field.value;
        if ((field.type === 'checkbox') || (field.type === 'radio')) {
            return (field.checked === true);
        }
        return (value !== null && value !== '');
    },
    // 最大长度
    max_length: function(field, length){
        if (!regexs.numericRegex.test(length)) {
            return false;
        }
        return (field.value.length >= parseInt(length, 10));
    },
    // 最小长度
    min_length: function(){

    }
    // 合法传真
    fax_no:function(){

    }
}

var Validator = function(formelm, fields, callback){

    // 将验证方法绑到 Validator 对象上去
    // for (var a in validation_method) this[a] = validation_method[a];

    this.isCallback = callback?true:false;
    this.callback = callback || function(){};
    this.form = _formElm(formelm) || {};
    this.errors = [];
    this.fields = {};
    this.handles = {};

    // 如果不存在 form 对象
    if(!formelm) return this;

    for (var i = 0, fieldLength = fields.length; i < fieldLength; i++) {
        
        var field = fields[i];
        // 如果通过不正确，我们需要跳过该领域。
        if ((!field.name && !field.names) || !field.rules) {
            console.warn(field);
            continue;
        }

        
        // * 构建具有所有需要验证的信息的主域数组
        if (field.names) {
            for (var j = 0, fieldNamesLength = field.names.length; j < fieldNamesLength; j++) {
                addField(this, field, field.names[j]);
            }
        } else {
            addField(this, field, field.name);
        }
    }

    // 使用 submit 按钮拦截
    var _onsubmit = this.form.onsubmit;
    this.form.onsubmit = (function(that) {
        return function(evt) {
            try {
                return that.validate(evt) && (_onsubmit === undefined || _onsubmit());
            } catch(e) {}
        };
    })(this);
}

Validator.prototype = {
    /**
     * [_validator 在提交表单时进行验证。或者直接调用validate]
     * @param  {[type]} evt [description]
     * @return {[type]}     [JSON]
     */
    validate:function(evt){

        this.handles["ok"] = true;
        this.handles["evt"] = evt;
        this.errors = [];

        for (var key in this.fields) {
            if(this.fields.hasOwnProperty(key)){
                var field = this.fields[key] || {},
                    element = this.form[field.name];


                if (element && element !== undefined) {
                    field.id = attributeValue(element, 'id');
                    field.element = element;
                    field.type = (element.length > 0) ? element[0].type : element.type;
                    field.value = attributeValue(element, 'value');
                    field.checked = attributeValue(element, 'checked');

                    this._validateField(field);
                }
            }
        }

        if (typeof this.callback === 'function') {
            this.callback(this.errors, evt);
        }

        // 如果有错误，停止submit 提交
        if (this.errors.length > 0) {
            if (evt && evt.preventDefault) {
                evt.preventDefault();
            } else if (event) {
                // IE 使用的全局变量
                event.returnValue = false;
            }
        }

        return this;
    },
    _validateField:function(field){
        

        var rules = field.rules.split('|'),
            isEmpty = (!field.value || field.value === '' || field.value === undefined);

        for (var i = 0,ruleLength = rules.length; i < ruleLength; i++) {
            
            var method = rules[i];
            var parts = regexs.rule.exec(method);

            var param = null;
            var failed = false;

            // 解析带参数的验证如 max_length(12)
            if (parts) method = parts[1],param = parts[2];

            if (typeof _testHook[method] === 'function') {
                if (!_testHook[method].apply(this, [field, param])) {
                    failed = true;
                }
            }

            if(failed){
                var message = (function(){
                    return field.display.split('|')[i] && field.display.split('|')[i].replace('{{'+field.name+'}}',field.value)
                })()

                var existingError;
                for (j = 0; j < this.errors.length; j += 1) {
                    if (field.element === this.errors[j].element) {
                        existingError = this.errors[j];
                    }
                }

                var errorObject = existingError || {
                    id: field.id,
                    display: field.display,
                    element: field.element,
                    name: field.name,
                    message: message,
                    messages: [],
                    rule: method
                };
                errorObject.messages.push(message);
                if (!existingError) this.errors.push(errorObject);
            }
        }
        return this;
    }
}

/**
 * [attributeValue 获取节点对象的属性]
 * @param  {[type]} element       [传入节点]
 * @param  {[type]} attributeName [需要获取的属性]
 * @return {[type]}               [返回String，属性值]
 */
 function attributeValue(element, attributeName) {
    var i;
    if ((element.length > 0) && (element[0].type === 'radio' || element[0].type === 'checkbox')) {
        for (i = 0, elementLength = element.length; i < elementLength; i++) {
            if (element[i].checked) {
                return element[i][attributeName];
            }
        }
        return;
    }
    return element[attributeName];
};
/**
 * [addField 构建具有所有需要验证的信息的主域数组]
 * @param {[type]} self      [Validator自己]
 * @param {[type]} field     [description]
 * @param {[type]} nameValue [description]
 */
function addField(self,field, nameValue){
    self.fields[nameValue] = {
        name: nameValue,
        display: field.display || nameValue,
        rules: field.rules,
        id: null,
        element: null,
        type: null,
        value: null,
        checked: null
    }
}

/**
 * [_formElm 获取 dome 节点对象]
 * @param  {[type]} elm [字符串或者节点对象]
 * @return {[type]}     [返回dom节点]
 */
function _formElm(elm){
    return (typeof elm === 'object') ? elm : document.forms[elm];
}
