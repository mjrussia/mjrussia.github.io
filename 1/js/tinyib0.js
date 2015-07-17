// go go go
var brd = location.pathname.match(/[^\/]+/) + "";
var IE = /*@cc_on!@*/ false;
var touch_device = 'ontouchstart' in document.documentElement;
//var touch_device = !!('ontouchstart' in window) || !!('onmsgesturechange' in window);

!function() {
    var dummy = {
        res: /\/res\/(\d+)\.html$/i.exec(document.location.pathname),
        index: /^\/[a-z0-9]{1,3}\/?(?:(\d+)\.html)?$/i.exec(document.location.pathname)
    };
    res = dummy.res ? dummy.res[1] : false;
    index = dummy.index ? (dummy.index[1] || 0) : false;
}();

// "lang" var set in HTML!
var txt = [];

function $X(path, root) {
    return document.evaluate(path, root || document, null, 6, null);
}

function $x(path, root) {
    return document.evaluate(path, root || document, null, 8, null).singleNodeValue;
}

function $del(el) {
    if (el)
        el.parentNode.removeChild(el);
}

function $each(list, Fn) {
    var i = 0,
            el;
    if (list) {
        while (el = list.snapshotItem(i)) {
            Fn(el, i++);
        }
    }
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

function addScript(src, callback) {
    var script = document.createElement('script');
    script.onload = function(e) {
        if (callback)
            callback(script, e);
    };
    document.head.appendChild(script);
    script.src = src;
}

function addStyle(src, callback) {
    var style = document.createElement('link');
    style.onload = function(e) {
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
    setTimeout(function() {
        if (c()) {
            return fn();
        }
        else {
            wait(c, fn);
        }
    }, 200);
}

// end lib


var Settings = function() {
    if (!window.localStorage) {
        return {
            set: function(key, value) {
                return setCookie(key, value, 365 * 24 * 60 * 60 * 1000);
            },
            get: function(key) {
                return getCookie(key);
            },
            del: function(key) {
                return setCookie(key, "", 1);
            }
        };
    } else
        return {
            set: function(key, value) {
                return window.localStorage.setItem(key, value);
            },
            get: function(key) {
                // legacy
                var cookie = getCookie(key);
                var local = window.localStorage.getItem(key);
                if (cookie && !local) {
                    window.localStorage.setItem(key, cookie);
                }
                // end legacy
                return window.localStorage.getItem(key);
            },
            del: function(key) {
                return window.localStorage.removeItem(key);
            }
        };
}();


var setLang = function() { // get lang and store it persistent
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

var setStyle = function() {

    var set_stylesheet_frame = function(styletitle, framename) {
        set_stylesheet(styletitle);
        var list = get_frame_by_name(framename);
        if (list)
            set_stylesheet(styletitle, list);
    };

    var set_stylesheet = function(styletitle, target) {
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

    var set_preferred_stylesheet = function(target) {
        var links = target ? target.document.getElementsByTagName("link") : document.getElementsByTagName("link");
        for (var i = 0; i < links.length; i++) {
            var rel = links[i].getAttribute("rel");
            var title = links[i].getAttribute("title");
            if (rel.indexOf("style") != -1 && title)
                links[i].disabled = (rel.indexOf("alt") != -1);
        }
    };

    var get_active_stylesheet = function() {
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
    var get_frame_by_name = function(name) {
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
    set_stylesheet(style || get_preferred_stylesheet());

    document.addEventListener("DOMContentLoaded", function() {
        var styles = [];
        var links = document.getElementsByTagName("link");
        for (var i = 0; i < links.length; i++) {
            var rel = links[i].getAttribute("rel");
            var title = links[i].getAttribute("title");
            if (rel.indexOf("style") != -1 && title) {
                styles.push(title);
            }
        }

        window.set_stylesheet_frame = set_stylesheet_frame;
    }, false);

// done with styles
};
setStyle();