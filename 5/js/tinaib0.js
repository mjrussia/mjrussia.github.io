// go go go
var brd = location.pathname.match(/[^\/]+/) + "";
var IE = /*@cc_on!@*/ false;
var touch_device = 'ontouchstart' in document.documentElement;
//var touch_device = !!('ontouchstart' in window) || !!('onmsgesturechange' in window);

res = /\/res\/\d+\.html$/i.test(document.location.pathname);
index = /^\/[a-z0-9]{1,3}\/?(?:(\d+|index)\.html)?$/i.test(document.location.pathname);

// "lang" var set in HTML!
var txt = [];

function $del(el) {
    if (el && el.parentNode)
        el.parentNode.removeChild(el);
}

function $el(html) {
    var dummy = document.createElement('div');
    dummy.innerHTML = html;
    return dummy.firstChild;
}
function setCookie(id, value, life) {
    if (id) {
        document.cookie = escape(id) + '=' + escape(value) + ';expires=' + (new Date(Date.now() + life)).toGMTString() + ';path=/';
    }
}

function getCookie(id) {
    var one, arr = document.cookie.split('; '),
            i = arr.length;
    while (i--) {
        one = arr[i].split('=');
        if (one[0] === escape(id)) {
            return unescape(one[1]);
        }
    }
    return false;
}

function createDocument(html, title) {
    var doc = document.implementation.createHTMLDocument(title);
    doc.documentElement.innerHTML = html;
    return doc;
}

function addScript(src, cb) {
    var script = document.createElement('script');
    script.onload = cb;
    
    script.src = src;
    document.head.appendChild(script);
}

function addStyle(src, callback) {
    var style = document.createElement('link');
    style.onload = function (e) {
        if (callback)
            callback(style, e);
    };
    style.type = 'text/css';
    style.rel = 'stylesheet';
    document.head.appendChild(style);
    style.href = src;

}

function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function generate_password() {
    var pass = '';
    var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (var i = 0; i < 8; i++) {
        var rnd = Math.floor(Math.random() * chars.length);
        pass += chars.substring(rnd, rnd + 1);
    }
    return pass;
}

function wait(c, fn) {
    setTimeout(function () {
        if (c()) {
            return fn();
        }
        else {
            wait(c, fn);
        }
    }, 200);
}

function $get(url, fn, fn2) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        fn(this.responseText);
    };
    xhr.onerror = function () {
        if (fn2) {
            fn2('HTTP ' + xhr.status + ' ' + xhr.statusText);
        }
    }
    xhr.send();
}

function $post(url, data, fn, fn2) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        fn(this.responseText);
    };
    xhr.onerror = function () {
        if (fn2) {
            fn2('HTTP ' + xhr.status + ' ' + xhr.statusText);
        }
    }
    xhr.send(data); //data 'user=person&pwd=password&organization=place&requiredkey=key'
}

// end lib


var Settings = function () {
    if (!window.localStorage) {
        return {
            set: function (key, value) {
                return setCookie(key, value, 365 * 24 * 60 * 60 * 1000);
            },
            get: function (key) {
                return getCookie(key);
            },
            del: function (key) {
                return setCookie(key, "", 1);
            }
        };
    } else
        return {
            set: function (key, value) {
                return window.localStorage.setItem(key, value);
            },
            get: function (key) {
                // legacy
                var cookie = getCookie(key);
                var local = window.localStorage.getItem(key);
                if (cookie && !local) {
                    window.localStorage.setItem(key, cookie);
                }
                // end legacy
                return window.localStorage.getItem(key);
            },
            del: function (key) {
                return window.localStorage.removeItem(key);
            }
        };
}();


var setLang = function () { // get lang and store it persistent
    // set lang
    if (document.location.hash) {
        var match;
        if (match = /set-lang:(en|ru)$/.exec(document.location.hash)) {
            Settings.set("tinyib-lang", match[1]);
            setCookie('tinyib-lang', match[1], 365 * 24 * 60 * 60 * 1000);
            document.location.hash = "";
            document.location.reload();
        }
    }
};
setLang();

var setStyle = function () {

    var set_stylesheet_frame = function (styletitle, framename) {
        set_stylesheet(styletitle);
        var list = get_frame_by_name(framename);
        if (list)
            set_stylesheet(styletitle, list);
    };

    var set_stylesheet = function (styletitle, target) {
        Settings.set("tinyib-style", styletitle);

        var links = target ? target.document.getElementsByTagName("link") : document.getElementsByTagName("link");
        var found = false;
        for (var i = 0; i < links.length; i++) {
            var rel = links[i].getAttribute("rel");
            var title = links[i].getAttribute("title");
            if (rel.indexOf("style") != -1 && title) {
                links[i].disabled = true; // IE needs this to work. IE needs to die.
                if (styletitle == title) {
                    links[i].disabled = false;
                    found = true;
                }
            }
        }
        if (!found) {
            if (target)
                set_preferred_stylesheet(target);
            else
                set_preferred_stylesheet();
        }
    };

    var set_preferred_stylesheet = function (target) {
        var links = target ? target.document.getElementsByTagName("link") : document.getElementsByTagName("link");
        for (var i = 0; i < links.length; i++) {
            var rel = links[i].getAttribute("rel");
            var title = links[i].getAttribute("title");
            if (rel.indexOf("style") != -1 && title)
                links[i].disabled = (rel.indexOf("alt") != -1);
        }
    };

    var get_active_stylesheet = function () {
        var links = document.getElementsByTagName("link");
        for (var i = 0; i < links.length; i++) {
            var rel = links[i].getAttribute("rel");
            var title = links[i].getAttribute("title");
            if (rel.indexOf("style") != -1 && title && !links[i].disabled)
                return title;
        }
        return null;
    };

    var get_preferred_stylesheet = function get_preferred_stylesheet() {
        var links = document.getElementsByTagName("link");
        for (var i = 0; i < links.length; i++) {
            var rel = links[i].getAttribute("rel");
            var title = links[i].getAttribute("title");
            if (rel.indexOf("style") != -1 && rel.indexOf("alt") == -1 && title)
                return title;
        }
        return null;
    };

    // 
    var get_frame_by_name = function (name) {
        var frames = window.parent.frames;
        for (i = 0; i < frames.length; i++) {
            if (name == frames[i].name) {
                return (frames[i]);
            }
        }
    };


    // Set style
    if (document.location.hash) {
        var match = /set-stylesheet:(\S+)$/.exec(document.location.hash);
        if (match) {
            Settings.set("tinyib-style", match[1]);
            document.location.hash = '';
        }
    }
    var style = Settings.get("tinyib-style");

    var avstyles = {
        "Photon": "photon.css",
        "Futaba": "futaba.css",
        "Neutron": "neutron.css",
        "Burichan": "burichan.css",
        "Gurochan": "gurochan.css",
        "Touhou Helloween": "touhou-helloween",
        "Touhou Helloween 2": "touhou-helloween 2"
    };

    var styles = [];
    var links = document.getElementsByTagName("link");
    for (var i = 0; i < links.length; i++) {
        var rel = links[i].getAttribute("rel");
        var title = links[i].getAttribute("title");
        if (rel.indexOf("style") != -1 && title) {
            styles.push(title);
        }
    }
    
    if (styles.indexOf(style) == -1 && avstyles[style]) {
        var link = document.createElement('link');
        link.onload = function () {
            set_stylesheet(style || get_preferred_stylesheet());
        };
        link.type = 'text/css';
        link.rel = 'alternate stylesheet';
        link.href = "/css/"+avstyles[style];
        link.title = style;
        
        document.head.appendChild(link);
        
        styles.push(style);
        
        set_stylesheet(style || get_preferred_stylesheet());
    } else {
        set_stylesheet(style || get_preferred_stylesheet());
    }
    window.set_stylesheet_frame = set_stylesheet_frame;
// done with styles
};
setStyle();

/*
 // send errors to server for debug
 window.onerror = function (message, url, line) {
 $post('/' + brd + '/api/jserror', 'message=' + encodeURIComponent(message)
 + '&loc=' + encodeURIComponent(document.location.href)
 + '&url=' + encodeURIComponent(url)
 + '&line=' + encodeURIComponent(line),
 function (res) {
 if (window.console) {
 console.log('JS error sent ' + res);
 }
 });
 return false;
 };
 
 */