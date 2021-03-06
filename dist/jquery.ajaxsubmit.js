/*!
 * jQuery AjaxSubmiter 3.0
 *
 * @date: 2017-09-21
 *
 * @author: gong yuwen
 *
 */
+function($){
    $.ajaxSubmitter = function( options, element, bind ){
        this.settings = $.extend( true, {}, $.ajaxSubmitter.defaults, options );
        this.element = element;
        this.promise = null;
        if( bind )
            this._init();
    };
    $.extend( $.ajaxSubmitter, {
        defaults: {
            additional: {},
            //默认beforeSend
            beforeSendFunc: function()
            {
                var self = this;

                var element = $( self.element );

                var holdElements = element.is('form') ? $('[type=submit]:visible', element) : element;

                holdElements.each( function(){
                    if( this.nodeName == 'BUTTON' && self.settings.icon )
                    {
                        var icon = loadingimgs[ self.settings.icon ] ? getScriptPath() + loadingimgs[ self.settings.icon ] : self.settings.icon;

                        $('<img>', { 'src': icon, 'class': 'ajaxSubmit-loading' } ).css('display', 'none').load(function(){
                            $( this ).show();
                        }).prependTo( this );
                    }
                });
                holdElements.addClass( this.settings.disableClass );

                element.addClass( this.settings.disableClass );

                return true;
            },

            //默认complete
            completeFunc: function()
            {
                var element = $( this.element );

                var holdElements = element.is('form') ? $('[type=submit]:visible', element) : element;

                $('img.ajaxSubmit-loading', holdElements ).remove();

                holdElements.removeClass( this.settings.disableClass );

                element.removeClass( this.settings.disableClass );
            },

            //回调上下文
            context:null,

            //返回类型
            dataType: 'json',

            //是否调试
            debug: false,

            //是否使用默认的beforeSend方法
            defBeforeSend: true,
            //是否使用默认的success方法
            defSuccess: true,
            //是否使用默认的complete方法
            defComplete:true,

            disableClass: 'disabled',

            doubleRequest: 'abort',

            getPostDatas: {},

            icon: 'default',

            successCallback: null,

            //默认的success方法
            successFunc: function( response )
            {
                var element = $( this.element );

                if( response.msg != undefined && response.msg != '' )
                    alert( response.msg );

                if( response.debug && response.exmsg != undefined && this.settings.debug )
                    $.ajaxSubmitter._console( response.exmsg );

                if( response.redirect != undefined && response.redirect != '' )
                    window.location.href = response.redirect;

                if( response.reset != undefined && response.reset == true && element.is('form') )
                    element[0].reset();
            },
            timeout: 0,

            type: 'POST',

            uploadFields: null,

            url: null
        },
        accepts: [
            'accepts',
            'async',
            'cache',
            'contents',
            'contentType',
            'context',
            'converters',
            'crossDomain',
            'dataType',
            'global',
            'headers',
            'ifModified',
            'isLocal',
            'jsonp',
            'jsonpCallback',
            'mimeType',
            'password',
            'processData',
            'scriptCharset',
            'statusCode',
            'timeout',
            'traditional',
            'type',
            'url',
            'username',
            'xhr',
            'xhrFields',
        ],
        prototype: {
            _init: function(){
                var nodeName = this.element.nodeName;

                var nodeType = this.element.type;

                if( nodeName == 'FORM' )
                    this.eventType =  'submit.ajaxSubmit';
                else if( nodeName == 'SELECT' || ( nodeName == 'INPUT' && nodeType != 'button' && nodeType != 'submit' ) )
                    this.eventType = 'change.ajaxSubmit';
                else
                    this.eventType = 'click.ajaxSubmit';

                $( this.element ).bind( this.eventType, this._delegate );
            },
            _delegate: function( event ){
                event.preventDefault();

                if( this.element )
                {
                    var element = $( this.element );

                    var ajaxSubmitter = this;
                }
                else
                {
                    var element = $( this );

                    var ajaxSubmitter = element.data( 'ajaxSubmitter' );
                }

                var settings = ajaxSubmitter.settings;

                if( settings.doubleRequest == 'reject' && element.hasClass( settings.disableClass ) )
                    return false;
                else if( settings.doubleRequest == 'abort' && ajaxSubmitter.promise  && ajaxSubmitter.promise.state() == 'pending' )
                    ajaxSubmitter._abortRequest();

                if( settings.url == undefined )
                    settings.url = element[0].nodeName == 'FORM' ? element.prop('action') == '' ? window.location.href : element.prop('action') : window.location.href;

                if( $.isFunction( settings.additional ) )
                    ajaxSubmitter.additionalDatas = settings.additional.call( ajaxSubmitter, element );
                else if( settings.additional )
                    ajaxSubmitter.additionalDatas = settings.additional;

                if( $.isFunction( settings.getPostDatas ) )
                {
                    ajaxSubmitter.datas = settings.getPostDatas.call( ajaxSubmitter, element );

                    if( ajaxSubmitter.datas == false )
                        return false;
                }
                else
                    ajaxSubmitter.datas = settings.getPostDatas;

                if( element[0].nodeName == 'FORM' )
                {
                    if( $.isEmptyObject( ajaxSubmitter.datas ) )
                    {
                        var file_iputs = $( '[type=file]', element );

                        if( file_iputs.length )
                            ajaxSubmitter.promise = ajaxSubmitter._ajaxWithFiles( file_iputs, $( '[name]:not([type=file])', element ) );
                        else
                            ajaxSubmitter.datas = element.serialize();
                    }
                }

                if( settings.uploadFields )
                {
                    if( $.type( settings.uploadFields ) == 'string' )
                        var file_iputs = $( settings.uploadFields );
                    else if( $.isFunction( settings.uploadFields ) )
                        var file_iputs = settings.uploadFields.call( ajaxSubmitter, element );
                    else if( settings.uploadFields.length )
                        var file_iputs = settings.uploadFields;

                    if( file_iputs.length )
                        ajaxSubmitter.promise = ajaxSubmitter._ajaxWithFiles( file_iputs );
                }

                if( !ajaxSubmitter.promise )
                    ajaxSubmitter.promise = ajaxSubmitter._ajax();

                ajaxSubmitter.promise.done( function( response ){
                    if( settings.defSuccess && settings.dataType == 'json' )
                        settings.successFunc.apply( ajaxSubmitter, arguments );

                    if( settings.successCallback != undefined && $.isFunction( settings.successCallback ) )
                        settings.successCallback.call( ajaxSubmitter, response, element );

                    var e = $.Event( 'success.ajaxSubmit', { response: response } );
                    element.trigger( e );
                })
                .fail( function(){
                    var e    = $.Event('fail.ajaxSubmit', { response: arguments });
                    element.trigger( e );
                })
                .always( function () {
                    ajaxSubmitter.promise = null;
                });
            },
            _beforeSend: function()
            {
                var result = true;

                if( this.settings.defBeforeSend )
                    result = this.settings.beforeSendFunc.apply( this, arguments );

                var e = $.Event( 'beforeSend.ajaxSubmit', arguments );

                $( this.element ).trigger( e );

                return result && e.result != 'undefined' && e.result != false;
            },
            _complete: function()
            {
                if( this.settings.defComplete )
                	this.settings.completeFunc.call( this, arguments );

                var e = $.Event( 'complete.ajaxSubmit', arguments );

                $( this.element ).trigger( e );
            },
            _ajax: function()
            {
                var self = this;

                var settings = self.settings;

                var datas = arguments[0] || self.datas;

                var additionalDatas = this._analysisData( this.additionalDatas );

                if( !$.isEmptyObject( additionalDatas ) )
                {
                    if( datas instanceof FormData )
                    {
                        $.each( additionalDatas, function( key, value ){
                            datas.append( key, value );
                        });
                    }
                    else if( $.type( datas ) == 'string' )
                        datas = ( datas.length == 0 ? '' : datas + '&' ) + $.ajaxSubmitter.serialize( additionalDatas );
                    else
                        $.extend( datas, additionalDatas );
                }

                var ajaxSettings = {
                    data: datas,

                    context: settings['context'] || self.element,

                    beforeSend: function( xhr, settings )
                    {
                        return self._beforeSend( xhr, settings );
                    }
                };

                $.ajaxSubmitter.accepts.forEach( function( key ){
                    if( settings[ key ] != undefined && ajaxSettings[ key ] == undefined )
                        ajaxSettings[ key ] = settings[ key ];
                });

                var task = $.ajax( ajaxSettings );

                task.always( function ( response, status ) {
                    self._complete( response, status );
                });

                return task;
            },
            _ajaxWithFiles: function( file_inputs ){

                var elements = arguments[1] ? arguments[1] : this._analysisData( this.datas, true );

                if( elements.length == undefined )
                {
                    $.ajaxSubmitter._console( 'Invalid Parameter: getPostDatas.', 'error' );

                    return;
                }

                var html5_support = this._html5Support();

                return html5_support ? this._ajaxWithFilesUseFormData( file_inputs, elements ) : this._ajaxWithFilesUseIframe( file_inputs, elements );
            },
            _ajaxWithFilesUseFormData: function( file_inputs, elements ){

                var fd = new FormData();

                $.each( elements, function(){
                    fd.append( this.name, $(this).val() );
                });

                $.each( file_inputs, function(){
                    fd.append( this.name, this.files[0] );
                });

                this.settings.processData = false;

                this.settings.contentType = false;

                this.settings.cache = false;

                return this._ajax( fd );
            },
            _ajaxWithFilesUseIframe: function( file_inputs, elements )
            {
                var self = this;

                var task = $.Deferred();

                self.id = new Date().getTime();

                var ifm = self._createIframe();

                ifm.error( function(){
                    task.reject( this, 'error');
                });

                var fm = self._createForm( file_inputs, elements );

                if( !self._beforeSend( fm ) )
                    task.reject( ifm[0], 'notmodified' );

                //abort
                task.fail( function(){
                    var ifm_win = ifm[0].contentWindow || ifm[0].contentDocument.parentWindow;

                    if (!!(window.attachEvent && !window.opera))
                        ifm_win.document.execCommand("stop");
                    else
                        ifm_win.stop();
                })
                .always(function(){
                    self._complete.apply( self, arguments );

                    self._removeIframeAndForm();
                });

                var timeout = self.settings.timeout == 0 ? 500 : self.settings.timeout;

                var callback = function()
                {
                    var ifm_document = ifm.contents();

                    if( ifm_document[0].readyState == 'complete' )
                    {
                        var response = {
                            responseText: $( 'body', ifm_document ).length == 1 ? $( 'body', ifm_document ).html() : null,
                            responseXML: ifm_document[0]
                        };

                        var data = $.ajaxSubmitter._uploadHttpData( response, self.settings.dataType );

                        task.resolve( data );
                    }
                    else if( self.settings.timeout == 0 )
                        setTimeout( callback, 500 );
                    else
                        task.reject( ifm[0], 'timeout' );
                }

                fm.submit();

                setTimeout( callback, timeout );

                return task;
            },
            _createIframe: function(){
                var ifm_id = 'ajaxSubmite-iframe-' + this.id;

                var ifm = $('<iframe>', { id: ifm_id, name: ifm_id } ).css( { position: 'absolute', top: '-9999px', left: '-9999px' } );

                ifm.appendTo( 'body' );

                return ifm;
            },
            _createForm: function( file_inputs, elements )
            {
                var settings = this.settings;

                var fm = $('<form>', { id: 'ajaxSubmite-form-' + this.id, action: settings.url, method: settings.type, enctype: 'multipart/form-data' } );

                var additionalElements = this._analysisData( this.additionalDatas, true );

                $.each( elements, function(){
                    $(this).clone().appendTo( fm );
                });

                $.each( additionalElements, function(){
                    fm.append( this );
                });

                $.each( file_inputs, function(){
                    var oldElement = $(this);
                    oldElement.clone().insertBefore( oldElement );
                    oldElement.appendTo( fm );
                });

                fm.css({ position: 'absolure', top: '-1200px', left: '-1200px' } );

                fm.prop( 'target',  'ajaxSubmite-iframe-' + this.id ).appendTo( 'body' );

                return fm;
            },
            _removeIframeAndForm: function()
            {
                var ifm_id = '#ajaxSubmite-iframe-' + this.id;

                var fm_id = '#ajaxSubmite-form-' + this.id;

                $( ifm_id + ',' + fm_id ).delay( 500 ).queue( function(){
                    $(this).remove();
                });
            },
            _abortRequest: function(){
                var promise = this.promise;

                promise.abort ? promise.abort() : promise.reject( document.getElementById( 'ajaxSubmite-iframe-' + this.id ), 'abort' );
            },
            _html5Support: function(){
                return typeof( FormData ) != 'undefined';
            },
            _analysisData: function( data ){
                var rtnElement = arguments[1] || false;

                /*serialized by serialize()*/
                if( /(^|&)([^:;@&=+$,#\s]+=[^:;@&=+$,#\s]*)/.test( data ) )
                    data = $.ajaxSubmitter.unserialize( data );
                //json string
                else if( $.type( data ) == 'string' )
                    eval( "data="+data);

                if( rtnElement )
                {
                    var elements = {};

                    var length = 0;

                    $.each( data, function( key, value ){
                        elements[ length++ ] = $('<input>', { type: 'hidden', name: key, value: value })[0];
                    });
                    elements.length = length;

                    return elements;
                }
                return data;
            },
            _rewrite: function( settings )
            {
                $.extend( this.settings, settings );
            }
        }
    });

    $.ajaxSubmitter._console = function( msg, type )
    {
        if( window.console )
        {
            if( type == 'warn' )
                console.warn( msg );
            if( type == 'log' )
                console.log(msg);
            if( type == 'error' )
                console.error( msg );
        }
    }
    $.ajaxSubmitter._uploadHttpData = function( response, type ) {
        var data = !type;
        data = type == "xml" || data ? response.responseXML : response.responseText;

        // If the type is "script", eval it in global context
        if ( type == "script" || type == 'jsonp' )
            $.globalEval( data );
        // Get the JavaScript object, if JSON is used.
        if ( type == "json" )
            eval( "data = " + data );
        // evaluate scripts within html
        if ( type == "html" )
            $("<div>").html(data).evalScripts();

        return data;
    }
    $.ajaxSubmitter.setDefaults = function( argument )
    {
        if( $.type( argument ) == 'string' && arguments.length == 2 )
            $.ajaxSubmitter.defaults[ argument ] = arguments[1];

        if( $.isPlainObject( argument ) )
            $.extend( $.ajaxSubmitter.defaults, argument );
    }
    $.ajaxSubmitter.serialize = function( datas )
    {
        var arrs = [];

        $.each( datas, function( key, value ){
            arrs.push( key + '=' + encodeURI( value ) );
        });
        return arrs.join('&');
    }
    $.ajaxSubmitter.unserialize = function( str )
    {
        var datas = {};

        $.each( str.split( '&' ), function( index, item ){
            var tmp = item.split( '=' );

            var key = decodeURIComponent( tmp[0] );

            var value = decodeURIComponent( tmp[1] );

            if( first = datas[ key ] )
            {
                if( first instanceof Array )
                    datas[ key ] = first.splice( first.length , 0, value );
                else
                    datas[ key ] = [ first, value ];
            }
            else
                datas[ key ] = value;
        });
        return datas;
    }

    $.ajaxSubmitter.onAjaxSubmit = function( e )
    {
        var context = arguments[1] ? arguments[1] : this;

        var options = arguments[2] ? arguments[2] : {};

        var ajaxSubmitter = $.data( context, 'ajaxSubmitter' );

        if( !ajaxSubmitter )
        {
            ajaxSubmitter = new $.ajaxSubmitter( options, context, false );

            $.data( this, 'ajaxSubmitter', ajaxSubmitter );
        }
        ajaxSubmitter._delegate( e );
    }
    function Plugin()
    {
    	var args = arguments;
    	
    	var options = args[0] || {};
    	 
        // If nothing is selected, return nothing; can't chain anyway
        if ( !this.length ) {
            if ( options && options.debug  ) {
                $.ajaxSubmitter._console( "Nothing selected, can't submit, returning nothing.", 'warn' );
            }
            return;
        }        

        this.each( function(){

            var ajaxSubmitter = $.data( this, 'ajaxSubmitter' );

            if( args.length <= 1 )
            {
                if( !ajaxSubmitter )
                {
                    ajaxSubmitter = new $.ajaxSubmitter( options || {}, this, true );

                    $.data( this, 'ajaxSubmitter', ajaxSubmitter );
                }
                return ajaxSubmitter;
            }

            var additional = args[1] ? args[1] : undefined;

            if( $.type( options ) == 'string' )
            {
                if( !ajaxSubmitter )
                {
                    $.ajaxSubmitter._console("Please init ajaxSubmit at first.", 'error');
                    return;
                }
                ajaxSubmitter._rewrite( additional );
            }
            else if( additional.preventDefault )
                $.ajaxSubmitter.onAjaxSubmit( additional, this, options );
        });
    }
    var loadingimgs = {
        'default': 'img/default.gif',
        'info': 'img/info.gif',
        'success': 'img/success.gif',
        'warning': 'img/warning.gif',
        'danger': 'img/danger.gif'
    };
    var getScriptPath = function() {
        var src = $("script[src*='jquery.ajaxsubmit']").prop('src');

        return src.replace( /[\w.]+$/, '' );
    }

    var old = $.fn.ajaxSubmit;

    $.fn.ajaxSubmit = Plugin;

    //NO CONFLICT
    $.fn.ajaxSubmit.noConflict = function () {
        $.fn.ajaxSubmit = old;
        return this;
    }
}(jQuery);