var postModule = function () {
    var postByNum = {}; // {pNum1: "html1", pNum2: "html2" ]
    var ajaxPosts = {}; //  { tNum : { keys:[11,45,545], 11:"html1", 45:"html2", 545:"html3"}, tNum2: {...}, ... }
    var refArr = {};
    var ancestor = function (el, test) {
        if (el.parentNode) {
            if (test(el.parentNode)) {
                return el.parentNode;
            } else {
                return ancestor(el.parentNode, test);
            }
        }
        return;
    };
    var ancestor_or_self = function (el, test) {
        if (el && el.parentNode) {
            if (test(el)) {
                return el;
            }
            if (test(el.parentNode)) {
                return el.parentNode;
            } else {
                return ancestor(el.parentNode, test);
            }
        }
        return;
    };
    // get ajaxed thread and populate ajaxPosts
    var parseThread = function (html) {

        var adoc = createDocument(html, 'test');
        var delform = adoc.getElementById('delform');
        var tNum = /\<a id\=\"(\d+)\"\>/i.exec(delform.innerHTML)[1];
        ajaxPosts[tNum] = {
            keys: []
        };
        ajaxPosts[tNum].keys.push(tNum);
        ajaxPosts[tNum][tNum] = delform.innerHTML.substring(0, delform.innerHTML.search(/.(?=\<table|<div\sclass\=\"clear)/i) - 1);
        [].forEach.call(adoc.getElementsByClassName('reply'), function (post) {
            var pNum = post.id.match(/\d+/);
            ajaxPosts[tNum].keys.push(pNum);
            ajaxPosts[tNum][pNum] = post.innerHTML;
        });
        var refs = [].filter.call(adoc.forms['delform'].getElementsByTagName('a'),
                function (el) {
                    var text = el.textContent.replace(/[\u00AD\u002D\u2011]+/g, "");
                    return (/^\>\>(?:\/?\S{1,4}\/)?\d+$/.test(text));
                });
        [].forEach.call(refs, function (link) {
            if (!link.href) {
                return;
            }
            var rNum = link.getAttribute('href').match(/\d+$/).toString(); // куда ссылается
            if (!rNum) {
                return;
            }
            var post = ancestor(link, function (el) {
                return (el.tagName == 'TD')
            });
            if (post && (postByNum[rNum] || ajaxPosts[tNum][rNum])) {
                getRefMap(post.id.match(/\d+/), rNum);
            }
        });
    };
    var delPostPreview = function (e) {

        var el = ancestor_or_self(e.relatedTarget, function (node) {
            return /^pstprev/i.test(node.id);
        });
        if (!el) {
            var pstprevs = [].filter.call(document.getElementsByTagName('div'),
                    function (el) {
                        return /^pstprev/i.test(el.id);
                    });
            [].forEach.call(pstprevs, $del);
        }
        else {
            while (el.nextSibling)
                $del(el.nextSibling);
        }
    };
    var showPostPreview = function (e) {

        var tNum = this.pathname.substring(this.pathname.lastIndexOf('/')).match(/\d+/);
        var pNum = this.hash.match(/\d+/) || tNum;
        var brd = this.pathname.match(/[^\/]+/); // for cross board links
        var html = document.documentElement;
        var body = document.body;
        var x = e.clientX + (html && html.scrollLeft || body && body.scrollLeft || 0) + 1;
        var y = e.clientY + (html && html.scrollTop || body && body.scrollTop || 0) - (html.clientTop || 0);
        var cln = document.createElement('div');
        cln.id = 'pstprev_' + pNum;
        cln.className = 'reply';
        cln.style.cssText = 'position:absolute; z-index:950; border:solid 1px #575763; top:' + y + 'px;' + (x < document.body.clientWidth / 2 ? 'left:' + x + 'px' : 'right:' + parseInt(document.body.clientWidth - x + 1) + 'px');
        cln.addEventListener('mouseout', delPostPreview, false);
        var aj = ajaxPosts[tNum];
        var decorate = function (cln) {
            doRefPreview(cln);
            doExpand(cln);
            doVideoLinks(cln);
            doVocaroo(cln);
            doMusicLinks(cln);
            doCodeHighlight(cln);
            if (refArr[pNum]) {
                showRefMap(cln, pNum, tNum);
            }
            setHighlightsHandler(cln);
            setQuotesHandler(cln);
        };
        cln.innerHTML = txt[lang]['js_Loading'];
        if (postByNum[pNum]) {
            cln.innerHTML = postByNum[pNum];
            decorate(cln);
        } else if (aj && aj[pNum]) {
            cln.innerHTML = aj[pNum];
            decorate(cln);
        } else {
            // AJAX
            $get("/" + brd + "/res/" + tNum + ".html", function (response) {
                parseThread(response);
                cln.innerHTML = ajaxPosts[tNum][pNum] || 'Пост не найден';
                decorate(cln);
            }, function (errmsg) {
                cln.innerHTML = errmsg;
            });
        }
        document.forms['delform'].appendChild(cln);
    };
    var ajaxening;
    var showNewPosts = function (btn) {
        if (ajaxening) {
            return;
        }
        ajaxening = true;
        var tNum = location.pathname.substring(location.pathname.lastIndexOf('/')).match(/\d+(?=\.html)/);
        var brd = location.pathname.match(/[^\/]+/);
        var tell = function (str) {
            if (btn) {
                btn.innerHTML = str;
            }
        };
        tell(txt[lang]['js_wait_a_sec']);
        $get("/" + brd + "/res/" + tNum + ".html", function (response) {
            parseThread(response);
            var pNum;
            var updated = false;
            for (var i = 0; i < ajaxPosts[tNum].keys.length; i += 1) {
                pNum = ajaxPosts[tNum].keys[i];
                if (!postByNum[pNum] && pNum != tNum) {
                    var cln = $el('<table><tbody><tr><td class="doubledash"> >> </td><td class="reply" id="reply' + pNum + '">' //
                            + ajaxPosts[tNum][pNum] + '</td></tr></tbody></table>');
                    var clears = document.getElementsByClassName('clear');
                    var before;
                    for (var i = 0; i < clears.length; i += 1) {
                        if (clears[i].tagName == 'DIV') {
                            before = clears[i];
                            break;
                        }
                    }

                    document.forms['delform'].insertBefore(cln, before);
                    updated = true;
                    postByNum[pNum] = ajaxPosts[tNum][pNum];
                    doRefPreview(cln);
                    doExpand(cln);
                    doVideoLinks(cln);
                    doVocaroo(cln);
                    doMusicLinks(cln);
                    doCodeHighlight(cln);
                    add_triangle(cln);
                    setHighlightsHandler(cln);
                    setQuotesHandler(cln);
                    setStarsHandler(cln);
                }
            }
            if (!updated) {
                tell(txt[lang]['js_no_new_posts']);
            }
            checkIn(brd);
            setTimeout(function () {
                tell(txt[lang]['js_update_thread']);
            }, 700);
            var highlights = document.forms["delform"].getElementsByClassName("highlight");
            for (var i = 0; i < highlights.length; i += 1) {
                highlights[i].className = "reply";
            }
            doRefMap();
            setTimeout(function () {
                ajaxening = false;
            }, 500)
        }, function (errmsg) {
            ajaxening = false;
            tell(txt['js_error'] + ":" + errmsg);
            setTimeout(function () {
                tell(txt[lang]['js_update_thread']);
            }, 700);
        });
    };
    var doRefPreview = function (node) {

        var refs = [].filter.call((node || document.forms['delform']).getElementsByTagName('a'),
                function (el) {
                    var text = el.textContent.replace(/[\u00AD\u002D\u2011]+/g, "");
                    return (/^\>\>(?:\/?\S{1,4}\/)?\d+$/.test(text));
                });
        [].forEach.call(refs, function (ref) {
            ref.addEventListener('mouseover', showPostPreview, false);
            ref.addEventListener('mouseout', delPostPreview, false);
        });
    };
    var showRefMap = function (post, pNum, tNum) {

        var map = document.createElement('div');
        map.id = 'rfmap_' + pNum;
        map.className = "small";
        map.innerHTML = '<i class="abbrev">&nbsp;' + txt[lang]['js_replies'] + ': </i><br />';
        var i = map.firstChild;
        for (rNum in refArr[pNum]) {
            var a = document.createElement('a');
            if (tNum) {
                a.href = "/" + brd + "/res/" + tNum + ".html#" + rNum;
            } else {
                a.href = "#" + rNum;
            }

            a.onclick = function () {
                highlight(rNum);
            };
            a.innerHTML = '&gt;&gt;' + rNum;
            i.appendChild(a);
            if (a.previousSibling.tagName == 'A') {
                i.insertBefore(document.createTextNode(", "), a);
            }
        }

        doRefPreview(map);
        var oldmap = post ? post.getElementsByClassName('small')[0] //
                : document.getElementById('rfmap_' + pNum);
        if (oldmap) {
            $del(oldmap);
        }
        if (post) {
            post.appendChild(map);
        }
        else {
            var el = document.getElementById(pNum);
            if (el) {
                while (el.tagName != 'BLOCKQUOTE') {
                    el = el.nextSibling; // seek
                }
                el.parentNode.insertBefore(map, el.nextSibling);
            }
        }
    };
// pnum contains >>rnum
    var getRefMap = function (pNum, rNum) { // populating refArr
        if (!refArr[rNum]) {
            refArr[rNum] = {};
        }
        refArr[rNum][pNum] = pNum;
    };
    var doRefMap = function () {

        var refs = [].filter.call(document.links,
                function (a) {
                    var text = a.textContent.replace(/[\u00AD\u002D\u2011]+/g, "");
                    return (/^\>\>(?:\/?\S{1,4}\/)?\d+$/.test(text)
                            && /res\/\d+\.html#\d+$/.test(a.href)
                            && !/^rfmap/.test(a.parentNode.parentNode.id));
                });
        [].forEach.call(refs, function (link) {
            var rNum = link.href.replace(/^.*#(\d+)$/, "$1"); // куда ссылается
            var post = ancestor(link, function (el) {
                return (el.tagName == 'TD')
            });
            if (post) {
                var pNum = post.id.match(/\d+/)[0];
                getRefMap(pNum, rNum);
            }
        });
        for (rNum in refArr) {
            var post = document.getElementById('reply' + rNum); // пост, на кот указывает ссылка
            showRefMap(post, rNum);
        }
    };
    function doParse() {

        var html = document.forms.delform.innerHTML;
        var threads = html //
                .substring(0, html.indexOf('userdelete">') - 13) //
                .split(/<(?:br|div)\s+class="clear"[\s</div>]*<h[r\s\/]*>/i);
        for (var i = 0, tLen = threads.length - 1; i < tLen; i++) {
            var tNum = threads[i] //
                    .match(/<input[^>]+checkbox[^>]+>/i)[0] //
                    .match(/(?:")(\d+)(?:")/)[1]; //
            postByNum[tNum] = threads[i].substring(0, threads[i].indexOf('<table>') - 7);
        }

        [].forEach.call(document.getElementsByClassName('reply'), function (rep) {
            if (rep.tagName == 'TD') {
                postByNum[rep.id.match(/\d+/)] = rep.innerHTML;
            }
        });
    }

    return {
        "doParse": doParse,
        "doRefMap": doRefMap,
        "doRefPreview": doRefPreview,
        "showNewPosts": showNewPosts
    };
}();
var txt = {
    ru: {
        'js_captcha_hint': "Введите буквы с картинки в поле ниже",
        'js_working': 'Работаю...',
        'js_no_new_posts': "Нет новых постов",
        'js_update_thread': 'Обновить тред',
        'js_replies': 'Ответы',
        'js_post_too_long': "Нажмите, чтобы прочитать пост полностью.",
        'js_thanks_take_it_back': "Спасибо, можно убирать.",
        'js_Loading': 'Загрузка...',
        'js_loading': "загрузка ",
        'js_err_occured': 'произошла ошибка',
        'js_loadering_cancelled': 'загрузка отменена',
        'js_expanded': 'раскрыто',
        'js_shrinked': 'свернуто',
        'js_to_close': 'Закрыть ',
        'js_file_from_post_no': "Файл из поста №",
        'js_thread_butthurt': "У меня от этого треда баттхерт!",
        'js_reply': 'Ответ',
        'js_new_thread': 'Создать тред',
        'js_toolong_substr': 'слишком длинный',
        'js_to_thread': 'К треду',
        'js_still_butthurt': 'Я все еще испытываю сильный баттхерт.',
        'js_butthurt_seems_gone': 'Баттхерт кажется прошел, хочу взглянуть, что там!',
        'js_clear_file': 'Очистить поле "Файл"',
        'js_error': 'Ошибка',
        'js_redirecting': 'Перенаправление',
        'js_op_image_required': 'Для создания треда нужно приложить картинку!',
        'js_attach_image_or_enter_message': 'Введите текст сообщения или приложите картинку!',
        'js_enter_message': 'Введите текст сообщения!',
        'js_enter_captcha': 'Введите капчу!',
        'js_already_listed': "В плейлисте уже есть этот трек!",
        'js_click_yt_link': "Кликните для просмотра видео",
        'js_click_vocaroo': "Кликните для воспроизведения записи",
        'js_post_not_found': 'Пост не найден',
        'js_wait_a_sec': 'Секундочку...',
        'js_Music': 'Музыка',
        'js_YT_player_size': ' Размер плеера: ',
        'save_btn': "Сохранить тред",
        'chk_cap_btn': "проверить капчу",
        'chk_cap_ok': 'можно постить',
        'chk_cap_fail': 'неверно',
        'js_over_9000_symbols': 'Слишком длинное сообщение!',
        'saved_draft': 'есть черновик',
        'form_sending': "Отправка..."
    },
    en: {
        'js_captcha_hint': "Enter symbols from picture to the field below",
        'js_working': 'Working...',
        'js_no_new_posts': "No new posts!",
        'js_update_thread': 'Update thread',
        'js_replies': 'Replies',
        'js_post_too_long': "Post is too long. Click here to view.",
        'js_thanks_take_it_back': "Hide",
        'js_Loading': 'Loading...',
        'js_loading': "loading ",
        'js_err_occured': 'error occured',
        'js_loadering_cancelled': 'loading cancelled',
        'js_expanded': 'expanded',
        'js_shrinked': 'shrinked',
        'js_to_close': 'Close ',
        'js_file_from_post_no': "File from post No.",
        'js_thread_butthurt': "I feel butthurt from this thread!",
        'js_reply': 'Reply',
        'js_new_thread': 'New thread',
        'js_toolong_substr': 'too long',
        'js_to_thread': 'Goto thread',
        'js_still_butthurt': 'I still feel butthurt.',
        'js_butthurt_seems_gone': 'Butthurt gone, want to check this thread!',
        'js_clear_file': 'Clear "File" field',
        'js_error': 'Error',
        'js_redirecting': 'Redirecting',
        'js_op_image_required': 'Image required!',
        'js_attach_image_or_enter_message': 'Enter message or attach image!',
        'js_enter_message': 'Enter message!',
        'js_enter_captcha': 'Enter captcha!',
        'js_already_listed': "Already playlisted!",
        'js_click_yt_link': "Click to play video",
        'js_click_vocaroo': "Click to play record",
        'js_post_not_found': 'Post not found',
        'js_wait_a_sec': 'Wait a sec...',
        'js_Music': 'Music',
        'js_YT_player_size': ' Player size: ',
        'save_btn': "Get thread archive",
        'chk_cap_btn': "pre-check captcha",
        'chk_cap_ok': 'ok, can post',
        'chk_cap_fail': 'incorrect',
        'js_over_9000_symbols': 'Message is too long!',
        'saved_draft': "draft saved",
        'form_sending': "Sending..."
    }
};
function ru_plural(n, one, two, mn) {
    if (/(?:1[0-9]|[567890])$/.test(n.toString())) {
        return mn;
    }
    if (/(?:^|[^1])1$/.test(n.toString())) {
        return one;
    }
    if (/(?:^|[^1])[234]$/.test(n.toString())) {
        return two;
    }
}

function en_plural(n, word) {
    if (!/1$/.test(n.toString())) {
        if (/s$/.test(word)) {
            return word + "es";
        }
        return word + "s";
    }
    return word;
}

function doUpdateBtn() {
    var btn = document.getElementById("updated");
    btn.style.margin = "0 .5em";
    btn.onclick = function () {
        postModule.showNewPosts(this);
        return false;
    };
}

function doArchBtn() {
    var ref = document.getElementById("updated");
    var btn = document.createElement("a");
    btn.innerHTML = txt[lang]['save_btn'];
    btn.href = "#archive_thread";
    btn.style.cursor = "pointer";
    btn.style.margin = "0 .5em";
    btn.onclick = function () {
        doArchiveThread();
        return false;
    };
    insertAfter(ref, btn);
}


function update_captcha(img) {
    img = img || document.getElementById('captchaimage');
    img.alt = txt[lang]['js_working'];
    img.src = "/" + brd + "/captcha?" + Math.floor(Math.random() * 10000000).toString();
    var form = document.forms["postform"] || document.forms["tinyib"] || document.forms['loginform'];
    form.captcha.value = '';
    img.alt = txt[lang]['js_captcha_hint'];
}

function getSelectedText() {
    if (window.getSelection && !window.opera) {
        return window.getSelection().toString();
    } else if (window.getSelection && navigator.userAgent.indexOf('Opera Mobi') == -1) { // opera preserves linebreaks in selection, workaround
        var oCurSelection = window.getSelection();
        var el = document.createElement("p");
        var frag = oCurSelection.getRangeAt(0).cloneContents();
        el.appendChild(frag);
        var recur = function (node) {
            var children = node.childNodes,
                    ind, child;
            for (ind in children) {
                child = children[ind];
                if (child.nodeType == Node.TEXT_NODE && '' !== child.nodeValue.replace(/\s+/g)) {
                    child.nodeValue = child.nodeValue.replace(/[\n\t\r]/g, ' ').replace(/\s+/g, ' ') + "\n";
                } else if (child.nodeType == Node.ELEMENT_NODE) {
                    recur(child);
                }
            }
        };
        recur(el);
        return el.innerText;
    } else if (document.selection && document.selection.type == "Text") {
        return document.selection.createRange().text;
    }
    return false;
}

function quote(postid) {

    var form = document.forms["postform"];
    var getSelectedFromLS = function () {
        if (!window.localStorage) {
            return false;
        }
        var json = window.localStorage.getItem('tmpquote');
        if (json) {
            var obj = JSON.parse(json);
            if (obj.postid === postid) {
                return obj.text;
            }
            window.localStorage.removeItem('tmpquote');
        }
        return false;
    };
    var theSelection = getSelectedText() || getSelectedFromLS();
    if (theSelection) {
        var strings = theSelection.split("\n");
        for (var i = 0; i < strings.length; i += 1) {
            strings[i] = strings[i].replace(/^\s+/, '').replace(/\s+$/, '').replace(/^[>]/, ' >');
            if (strings[i] === '') {
                strings.splice(i, 1);
                i -= 1;
            }
        }
        if (form.message.value.indexOf('>>' + postid) === -1) {
            insert('>>' + postid + "\n");
        }
        insert('>' + strings.join("\n>") + "\n");
    } else {
        insert('>>' + postid);
    }
}

function insert(text) {
    var message = document.forms["postform"].message;
    if (message) {
        if (document.selection && message.tagName == 'TEXTAREA') {
//IE textarea support
            message.focus();
            var sel = document.selection.createRange();
            sel.text = text;
            message.focus();
        } else if (message.selectionStart || message.selectionStart == '0') {
            var startPos = message.selectionStart;
            var endPos = message.selectionEnd;
            var scrollTop = message.scrollTop;
            message.value = message.value.substring(0, startPos) + text + message.value.substring(endPos, message.value.length);
            message.focus();
            message.selectionStart = startPos + text.length;
            message.selectionEnd = startPos + text.length;
            message.scrollTop = scrollTop;
        } else {
// IE input[type=text] and other browsers
            message.value += text;
            message.focus();
            message.value = message.value; // forces cursor to end
        }
    }
}

function highlight(post) {

    [].forEach.call(document.getElementsByClassName('highlight'), function (hl) {
        hl.className = 'reply';
    });
    var reply = document.getElementById("reply" + post);
    if (reply) {
        reply.className = "reply highlight";
        document.location.hash = post.toString(); // force jump to anchor
        return false;
    }
    return true;
}

function toggle(node) {
    node.style.display = (node.style.display != 'none' ? 'none' : '');
}

function doTruncate() {

    var bqs = [].filter.call(
            document.getElementsByTagName('blockquote'),
            function (bq) {
                return (bq.parentNode.className == 'reply' //
                        || bq.parentNode.className == 'reply highlight' //
                        || bq.parentNode.tagName == 'FORM');
            });
    [].forEach.call(bqs, function (block) {
        var height = block.offsetHeight;
        var captionate = function (a, bqh) {

            var hidden_lines;
            if (window.getComputedStyle) {
                var line_height = document.defaultView
                        .getComputedStyle(block)
                        .getPropertyValue("line-height")
                        .replace(/px/, "");
                hidden_lines = Math.round((height - bqh) / line_height);
            }
            a.innerHTML = "&nbsp;" + txt[lang]['js_post_too_long'];
            if (hidden_lines) {
                if (lang == 'en') {
                    a.innerHTML += " +" + hidden_lines + " " + en_plural(hidden_lines, "line");
                } else if (lang == 'ru') {
                    a.innerHTML += " +" + hidden_lines + " "
                            + ru_plural(hidden_lines, "строка", "строки", "строк");
                }
            }
        };
        if (height - 250 > 50) {
// truncate
            block.style.overflowY = 'hidden';
            block.style.setProperty("height", "250px", "important");
            var a = document.createElement("span");
            a.className = "shortened";
            captionate(a, 250);
            a.onclick = function () {
                toggle(this);
                toggle(b);
                block.style.setProperty("height", "auto", "important");
            };
            insertAfter(block, a);
            var b = document.createElement("span");
            b.style.display = "none";
            b.className = "shortened";
            b.innerHTML = "&nbsp;" + txt[lang]['js_thanks_take_it_back'];
            b.onclick = function () {
                toggle(this);
                toggle(a);
                captionate(a, 200);
                block.style.setProperty("height", "200px", "important");
            };
            insertAfter(block, b);
        }
    });
} //

function doExpand(node) {
    [].forEach.call((node || document).getElementsByClassName('thumb'),
            function (img) { // expand pics and stuff
                var a = img.parentNode;
                var id = img.getAttribute("id").substr(5); // post id
                if (/\.jpe?g|\.png|\.gif/i.test(a.href)) { // images
                    var maxwidth = document.body.clientWidth - ((a.parentNode.tagName == 'TD') ? 100 : 60); // podporka
                    var th_src = img.src.toString();
                    img.style.maxWidth = maxwidth + 'px';
                    var loadering, preloaded;
                    a.onclick = function () {
                        var progress = document.createElement("div");
                        progress.style.position = "absolute";
                        progress.style.margin = "6px 24px";
                        progress.style.backgroundColor = window.getComputedStyle(node || document.body).getPropertyValue('background-color');
                        a.appendChild(progress);
                        var clear = function () {
                            setTimeout(function () {
                                $del(progress);
                            }, 700);
                        };
                        if (loadering) { // check 
                            var ev = document.createEvent("HTMLEvents");
                            ev.initEvent('cancel', true, false);
                            preloaded.dispatchEvent(ev);
                        } else if (img.src != a.href) { // load and show full pic
                            if (img.width)
                                img.removeAttribute("width");
                            if (img.height)
                                img.removeAttribute("height");
                            if (a.style.position != "static")
                                a.style.position = "static";
                            if (a.style.display != "block")
                                a.style.display = "block";
                            progress.innerHTML = txt[lang]['js_loading'];
                            loadering = true;
                            preloaded = document.createElement("img");
                            preloaded.src = a.href;
                            preloaded.addEventListener('cancel', function (e) {
                                window.clearInterval(interval);
                                loadering = false;
                                preloaded.onerror = function () {
                                }; // kostyl iz govna
                                preloaded.src = '';
                                preloaded = false;
                                progress.innerHTML = txt[lang]['js_loadering_cancelled'];
                                clear();
                            }, false);
                            preloaded.onload = function (e) {
                                loadering = false;
                                window.clearInterval(interval);
                                img.src = preloaded.src;
                                progress.innerHTML = txt[lang]['js_expanded'];
                                clear();
                            }

                            preloaded.onerror = function (e) {
                                window.clearInterval(interval);
                                loadering = false;
                                preloaded.src = '';
                                preloaded = false;
                                progress.innerHTML = txt[lang]['js_err_occured'];
                                clear();
                            };
                            progress.innerHTML += " /";
                            var interval = setInterval(function () {
                                rotator(progress);
                            }, 100);
                        } else { // return thumb                    
                            img.src = th_src;
                            progress.innerHTML = txt[lang]['js_shrinked'];
                            clear();
                        }
                        return false;
                    };
                }
                else if (/\.swf/i.test(a.href)) { // flash
                    a.onclick = function () {
                        toggle(img);
                        var span = document.createElement('span');
                        span.className = 'shortened';
                        span.innerHTML = txt[lang]['js_to_close'];
                        span.onclick = function () {
                            swfobject.removeSWF('flashcontent_' + id);
                            toggle(img);
                            this.parentNode.removeChild(this);
                        };
                        var div = document.createElement('div');
                        div.setAttribute("id", "flashcontent_" + id);
                        insertAfter(a, div);
                        insertAfter(div, span);
                        var att = {
                            data: a.href,
                            width: "640",
                            height: "480"
                        };
                        var par = {
                            allowScriptAccess: "never",
                            wmode: "transparent"
                        };
                        var obj = swfobject.createSWF(att, par, "flashcontent_" + id);
                        obj.className = 'thumb';
                        return false;
                    };
                }
                else if (/\.mp3/i.test(a.href)) { // mp3            
                    a.onclick = function () {
                        var info = function () {
                            var info = document.getElementById('mp3info_' + id);
                            if (info)
                                return info.innerText || info.textContent;
                            else
                                return txt[lang]['js_file_from_post_no'] + id;
                        }();
                        muPlayer.add(id, a.href, info);
                        return false;
                    };
                }
                else if (/\.ogg/i.test(a.href)) { // ogg           
                    a.onclick = function () {
                        muPlayer.add(id, a.href, txt[lang]['js_file_from_post_no'] + id);
                        return false;
                    };
                }
                else if (/^(?:webmAV|ogvAV|mp4AV)[_]/.test(a.id)) { // normal video

                    a.onclick = function () {
                        toggle(img);
                        var video = document.createElement('video');
                        video.className = 'thumb';
                        video.src = a.href;
                        video.controls = true;
                        video.autoplay = true;
                        video.volume = 0.5;
                        video.style.maxWidth = "70%";
                        var span = document.createElement('span');
                        span.className = 'shortened';
                        span.innerHTML = txt[lang]['js_to_close'];
                        span.style.float = "left";
                        span.onclick = function () {
                            video.pause();
                            video.src = '';
                            $del(video);
                            $del(span);
                            toggle(img);
                        };
                        insertAfter(a, span);
                        insertAfter(a, video);
                        return false;
                    };
                }
                else if (/^(?:webm|ogv|mp4)V[_]/.test(a.id)) { // pseudo gif
                    // autoloop
                    // no controls
                    // close onclick
                    a.onclick = function () {
                        toggle(img);
                        var video = $el('<video src="' + a.href + '" class="thumb" autoplay muted loop ></video>');
                        video.onclick = function () {
                            toggle(img);
                            $del(video);
                        };
                        insertAfter(a, video);
                        return false;
                    };
                }
                else if (/^webmA[_]/.test(a.id)) { // audio track
                    // send to player
                    a.onclick = function () {
                        muPlayer.add(id, a.href, txt[lang]['js_file_from_post_no'] + id);
                        return false;
                    };
                }
            });
}

function doShowHide() {
    var save = function (obj) {
        Settings.set('hidden', JSON.stringify(obj));
    };
    var json = Settings.get('hidden');
    if (!json)
        return;
    window.showhide = function () {
        var elems = document.forms['delform'].children;
        var id = 0;
        var collection = [];
        var threads = [];
        var threadById = [];
        var helper = function (id) { // showhide button does
            return function () {
                var data = JSON.parse(Settings.get('hidden'));
                var arr = data[brd];
                var key = arr.indexOf(id);
                if (key == -1) {
                    arr.push(id); // add
                } else {
                    arr.splice(key, 1); // del
                }

                save(data);
                window.showhide(id);
            };
        };
        for (var i = 0; i < elems.length; i += 1) {
            var el = elems[i];
            if (el.tagName == 'A' && el.id.match(/^\d+$/)) {
                id = el.id;
                threadById[id] = threads[threads.length] = {
                    "id": id,
                    "control": {},
                    "nodes": []
                };
            }
            if (el.tagName == 'BLOCKQUOTE') {
                var span = document.createElement("span");
                span.className = 'shortened';
                span.innerHTML = txt[lang]['js_thread_butthurt'];
                span.onclick = helper(id);
                document.forms['delform'].insertBefore(span, el);
                threadById[id].control = span;
                i += 1;
            }

            if (!(el.tagName == 'BR' && el.style.clear == 'both') && !(el.tagName == 'HR') && !(el.className == 'reflink') && !(el.innerHTML && el.innerHTML == 'Ответ')) {
                collection.push(el);
            }
            if (el.innerHTML == txt[lang]['js_reply']) {
                threadById[id].link = el;
            }

            if (el.tagName == 'HR') { // thread done
                threadById[id].nodes = collection;
                var collection = [];
            }
        }
        delete collection;
        return function (id) {
            if (!threadById[id])
                return false;
            for (var i = 0; i < threadById[id].nodes.length; i += 1) {
                var node = threadById[id].nodes[i];
                if (node.className == 'shortened') {
                    if (node.innerHTML.indexOf(txt[lang]['js_toolong_substr']) != -1 && node.style.display != 'none')
                        node.click();
                    $del(node);
                    threadById[id].nodes.splice(i, 1);
                    i -= 1;
                }
                if (node.style) {
                    node.style.display = (node.style.display != 'none' ? 'none' : '');
                }
            } // end for
            threadById[id].link.innerHTML = (threadById[id].link.innerHTML == txt[lang]['js_reply'] ? txt[lang]['js_to_thread'] : txt[lang]['js_reply']);
            threadById[id].control.innerHTML = ((threadById[id].control.innerHTML == txt[lang]['js_thread_butthurt'] || threadById[id].control.innerHTML == txt[lang]['js_still_butthurt']) ? txt[lang]['js_butthurt_seems_gone'] : txt[lang]['js_still_butthurt']);
        };
    }();
    var obj = JSON.parse(json) || {};
    var hidden = obj[brd] || (obj[brd] = [], save(obj), obj[brd]);
    for (var i = 0; i < hidden.length; i += 1) {
        showhide(hidden[i]);
    }
}

function doDelForm() {
    var form = document.forms['delform'];
    if (form.password) {
        form.password.value = Settings.get("password");
    }
}

function doPostForm() {
    var form = document.forms['postform'];
    var submitbutton = form.subject.nextElementSibling;
    var submit_caption = submitbutton.value;
    if (form.noko && /i\d+/.test(document.location.hash) == false) {
        form.noko.checked = true;
    }

    form.password.value = Settings.get("password");
    form.name.value = Settings.get("name") || '';
    form.email.value = Settings.get("email") || '';
    form.name.onchange = function () {
        Settings.set("name", form.name.value);
    }
    form.email.onchange = function () {
        Settings.set("email", form.email.value);
    }

    if (form.file) {
        var clfile = document.createElement('span');
        clfile.className = 'shortened';
        clfile.style.display = 'none';
        clfile.onclick = function () {
            form.file.value = null;
            clfile.style.display = 'none';
        };
        clfile.innerHTML = ' x ';
        clfile.title = txt[lang]['js_clear_file'];
        insertAfter(form.file, clfile);
        form.file.onchange = function () {
            clfile.style.display = '';
        };
    }

    if (form.captcha) {
        var clcap = document.createElement("span");
        clcap.className = 'shortened';
        clcap.style.display = 'none';
        clcap.style.margin = "0 .5em";
        clcap.innerHTML = txt[lang]['chk_cap_btn'];
        clcap.onclick = function () {
            var cap = form.captcha.value.toString();
            $post("/" + brd + "/api/validate-captcha", "captcha=" + encodeURI(cap), function (str) {
                var data = JSON.parse(str);
                if (data.status == 'ok') {
                    clcap.innerHTML = txt[lang]['chk_cap_ok'];
                } else {
                    clcap.innerHTML = txt[lang]['chk_cap_fail'];
                    setTimeout(function () {
                        clcap.innerHTML = txt[lang]['chk_cap_btn'];
                    }, 700);
                }
            }), function (err) {
                clcap.innerHTML = err;
                setTimeout(function () {
                    clcap.innerHTML = txt[lang]['chk_cap_btn'];
                }, 1500);
            };
        };
        insertAfter(form.captcha, clcap);
        form.captcha.onfocus = function () {
            clcap.style.display = "";
        };
    }
    var captcha_required, csstest;
    // SET form target
    // fake-ajax
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'about:blank';
    form.target = iframe.name = iframe.id = 'postframe';
    document.body.appendChild(iframe);
    iframe.onload = function () {
        var idoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!idoc || !idoc.body || !idoc.body.innerHTML) {
            return false;
        }
        var res = /res/.test(document.location.href); // we are on res page

        csstest = undefined;
        var h1 = idoc.getElementsByTagName('h1')[0];
        if (h1 && (h1.innerHTML.indexOf(txt[lang]['js_error']) != -1)) { // error
            var msg = idoc.getElementsByTagName('h2')[0].textContent || idoc.getElementsByTagName('h2')[0].innerHTML;
            alert(msg);
            update_captcha(document.getElementById("captchaimage"));
        } else if (h1 && (h1.innerHTML.indexOf(txt[lang]['js_redirecting']) != -1)) { // ok
            if (window.localStorage) {
                window.localStorage.removeItem("draft_" + brd + "_" + form.parent.value);
            }
            var meta = idoc.getElementsByTagName('meta')[0];
            if (res && form.noko && form.noko.checked) { // on res page, need to reinit form
                form.message.value = '';
                form.subject.value = '';
                form.captcha.value = "";
                captcha_required = undefined;
                update_captcha(document.getElementById("captchaimage"));
                document.getElementById("captcha_tr").style.display = "none";
                var insert_id = meta.content.match(/\d+$/);
                if (["sage", "сажа"].indexOf(form.email.value) != -1)
                    form.email.value = '';
                if (form.file && form.file.value && clfile)
                    clfile.click();
                if (form.with_oek) { // reset oek
                    form.with_oek.checked = '';
                    var preview = document.getElementById("oek_image_preview");
                    var style_bak = preview.style.backgroundImage.toString();
                    preview.style.backgroundImage = '';
                    preview.style.backgroundImage = style_bak;
                    document.location.hash = '';
                    document.getElementById("oek-showhide").checked = '';
                }

                postModule.showNewPosts();
                var intervalID = false;
                intervalID = window.setInterval(function () {
                    if ((window.frames.main || window).highlight(insert_id) == false)
                        window.clearInterval(intervalID)
                }, 100);
            }
            else { // follow redirect
                document.location.href = meta.content.match(/url[=](.+)$/)[1];
            }
        }

        submitbutton.value = submit_caption;
        postering = false;
        idoc.location.replace('about:blank');
    };
    var captcha_challenge = function () {
        document.getElementById("captcha_tr").style.display = "table-row";
        update_captcha();
        form.captcha.focus();
    };
    var captchering;
    var requires_captcha = function () {
        if (captchering) {
            return false;
        }
        captchering = true;
        $get("/" + brd + "/api/requires-captcha", function (response) {
            captchering = false;
            var obj = JSON.parse(response);
            captcha_required = obj['requires-captcha'];
        });
        wait(function () {
            return (captcha_required !== undefined);
        }, function () {
            captchering = false;
            if (form.onsubmit())
                form.submit();
        });
    };
    var csstestering;
    var css_challenge = function () {
        if (csstestering) {
            return false;
        }
        csstestering = true;
        var iframe = $el('<iframe class="ninja" id="csstest" src="about:blank"></iframe>');
        document.body.appendChild(iframe);
        iframe.src = '/' + brd + '/csstest.foo';
        iframe.onload = function () {
            $del(iframe);
            csstest = true;
            csstestering = false;
            if (form.onsubmit()) {
                form.submit();
            }
        };
    };
    var postering = false; // true when sending data to iframe
    form.onsubmit = function () {
        var res = !(form.parent.value == 0);
        if (postering) {
            return false;
        }
        var image_attached = (form.file && form.file.files && form.file.files.length > 0) || //
                (form.file && form.file.value) || //
                (form.with_oek && form.with_oek.checked);
        var message_entered = (form.message.value != '');
        var textboard = (!form.file && !form.with_oek);
        if (!res && !image_attached && !textboard) {
            alert(txt[lang]['js_op_image_required']);
            return false;
        }

        if (res && !image_attached && !message_entered) {
            alert(txt[lang]['js_attach_image_or_enter_message']);
            form.message.focus();
            return false;
        }

        if (textboard && !message_entered) {
            alert(txt[lang]['js_enter_message']);
            form.message.focus();
            return false;
        }

        if (form.message.value && form.message.value.length > 9000) {
            alert(txt[lang]['js_over_9000_symbols'] + " " + form.message.value.length + "/" + 9000);
            return false;
        }

        if (["sage", "сажа"].indexOf(form.email.value) != -1) {
            Settings.del("email");
        }

        if (captcha_required === undefined) {
            requires_captcha();
            return false;
        }

        if (captcha_required === '1'
                && document.getElementById("captcha_tr").style.display != 'table-row') {
            captcha_challenge();
            return false;
        }

        if (captcha_required === '1'
                && document.getElementById("captcha_tr").style.display != 'none' && form.captcha.value == '') {
            alert(txt[lang]['js_enter_captcha']);
            return false;
        }
        if (!csstest) {
            css_challenge();
            return false;
        }

        checkIn(brd);
        submitbutton.value = txt[lang]['form_sending'];
        postering = true;
        return true;
    };
    // drafts
    if (window.localStorage) {

//add del button
        var deldraft = $el('<span class="filesize" style="display:none;' + //first
                'cursor:pointer;position:absolute;right:.5em;top:.5em;">✖</span>');

        deldraft.onclick = function () {
            form.message.value = '';
            window.localStorage.removeItem("draft_" + brd + "_" + form.parent.value);
            deldraft.style.display = 'none';
        };
        var scrw0;
        var fix_margin = function () {
            // fix margin
            var scrw = (form.message.offsetWidth - form.message.clientWidth);
            if (scrw == scrw0) { // no overflow added/removed
                return;
            }
            scrw0 = scrw;
            if (scrw > 4) { // scroll
                deldraft.style.right = (1.4 * scrw) + "px";
            } else {
                deldraft.style.right = ".5em";
            }
        };

        form.message.addEventListener("mouseup", fix_margin, false);
        form.message.addEventListener("input", fix_margin, false);

        var wrap = document.createElement('div');
        wrap.style.position = 'relative';
        wrap.style.display = 'inline-block';
        insertAfter(form.message, wrap);
        wrap.appendChild(form.message);
        wrap.appendChild(deldraft);
        // load draft
        var load_draft = function (form) {
            var draft = window.localStorage.getItem("draft_" + brd + "_" + form.parent.value);
            if (draft) {
                insert(draft);
                deldraft.style.display = '';
                fix_margin();
            }
        };
        window.load_draft = load_draft;
        load_draft(form);
        var mesg0;
        var save_draft = function () {
            try {
                localStorage.setItem("draft_" + brd + "_" + form.parent.value, form.message.value);
                mesg0 = form.message.value;
            } catch (e) { // catch quota exceeded
                if (window.draftint) {
                    window.clearInterval(draftint);
                    form.message.onchange = null;
                }
            }
        };
        // save loop 

        form.message.addEventListener('change', function () {
            deldraft.style.display = '';
            save_draft();
        }, false);
        var draftint = setInterval(function () {
            if (form.message.value && mesg0 != form.message.value // changed
                    && window.localStorage.getItem("draft_" + brd + "_" + form.parent.value) == mesg0 //saved on this page before
                    ) {
                save_draft();
                deldraft.style.display = '';
            }

        }, 5000);
    }
}

function checkIn(brd) {
    if (!brd || !document.forms['delform'])
        return;
    var json = Settings.get('visited');
    var obj = json ? JSON.parse(json) : {};
    obj[brd] = Math.round((new Date()).getTime() / 1000);
    Settings.set('visited', JSON.stringify(obj));
    // detect menu frame
    if (window.top.frames && window.top.frames[0]) {
        var newlink = window.top.frames[0].document.getElementById("new_" + brd); // find counter span
        if (newlink) {
            var a = newlink.previousElementSibling;
            if (a && a.href && window.top.frames[0].poststosee) {
                a.onclick(); // clr counter
                window.top.frames[0].poststosee[brd] = 0; // truncate tmp counter
            }
        }
    }
}

function doStars() {
    var doom = function (htmlobj) {
        var life = within(3000, 5000);
        setTimeout(function () {
            $del(htmlobj);
        }, life);
    };
    var within = function (x0, x1) {
        return Math.floor(Math.random() * (x1 - x0 + 1)) + x0;
    };
    var star = function (block) {
        setTimeout(function () {
            var width = block.clientWidth;
            var height = block.clientHeight;
            var star = document.createElement('img');
            star.src = '/3stars.gif';
            star.style.position = 'absolute';
            star.style['float'] = 'left';
            star.style.opacity = '0.8';
            star.width = within(10, 32);
            star.style.left = within(0, width - star.width / 2) + 'px';
            star.style.top = within(0, height - star.width / 2) + 'px';
            block.appendChild(star);
            doom(star);
        }, within(1000, 1500));
    };
    var vips = document.getElementsByClassName('postertrip vip');
    window.starsInterval = setInterval(function () {
        [].forEach.call(vips, function (vip) {
            if (/\!\!O\+5EaXxy/.test(vip.innerHTML)) {
                vip.title = 'Госпожа Тина';
            }
            star(vip);
        });
    }, 2000);
    window.setStarsHandler = function () {
        vips = document.getElementsByClassName('postertrip vip');
    };
}
var muPlayer = {
    getWindow: function () {
        var playerWindow = window.open('', "playerWindow", "width=520,height=500,left=600,top=100,menubar=no,directories=no,location=no,resizable=yes,scrollbars=no,status=no");
        if (!playerWindow.document.getElementById('playlist')) { // new window, build stuff
            playerWindow.document.write('<html><head><title>' + txt[lang]['js_Music'] + '</title><script src="/js/swfobject.js"></script></head><body><div id="playlist"></div></body></html>');
            playerWindow.document.close();
            var list = playerWindow.document.getElementById('playlist');
            playerWindow.players = [];
            playerWindow.js_on_play = function (player_id) {
                for (var i = 0; i < playerWindow.players.length; i += 1) {
                    if (playerWindow.players[i] != player_id)
                        playerWindow.document.getElementById(playerWindow.players[i]).js_stop();
                }
            };
            playerWindow.js_on_end_track = function (player_id) {
                var next = playerWindow.players.indexOf(player_id) + 1;
                if (playerWindow.players[next])
                    playerWindow.document.getElementById(playerWindow.players[next]).js_play();
            };
        }
        return playerWindow;
    },
    add: function (id, src, info) {
        var playerWindow = this.getWindow();
        var el = playerWindow.document.getElementById('file_' + id);
        if (el) {
            return alert(txt[lang]['js_already_listed']);
        }


        var fn = function () {
            playerWindow.players[playerWindow.players.length] = 'player_' + id;
            var list = playerWindow.document.getElementById('playlist');
            var item = playerWindow.document.createElement('div');
            item.id = 'file_' + id;
            var p = playerWindow.document.createElement('p');
            p.style.marginBottom = "6px";
            list.appendChild(item);
            item.appendChild(p);
            p.appendChild(document.createTextNode(info));
            if (/mp3$/.test(src)) {
                // swf + mp3
                var dummy = playerWindow.document.createElement('div');
                dummy.id = "player_" + id;
                item.appendChild(dummy);
                var flashvars = {
                    player_id: 'player_' + id,
                    soundfile: src

                };
                var params = {
                    wmode: "transparent",
                    allowscriptaccess: "always"
                };
                var attributes = {
                    id: "player_" + id
                };
                var autoplay = function (e) {
                    setTimeout(function () {
                        if (playerWindow.players.length == 1)
                            playerWindow.document.getElementById(playerWindow.players[0]).js_play();
                    }, 500);
                };
                playerWindow.swfobject.embedSWF("/nx_audio_player.swf", "player_" + id, "500", "40", "9.0.0", false, flashvars, params, attributes, autoplay);
                // swf end
            }
            else {

                var video = playerWindow.document.createElement('video');
                video.src = src;
                video.controls = true;
                video.volume = 0.6;
                video.width = 500;
                video.height = 20;
                video.id = "player_" + id;
                video.className = 'html5';
                // legacy
                video.onended = function () {
                    playerWindow.js_on_end_track(video.id);
                    return false;
                };
                video.js_stop = function () {
                    video.pause();
                };
                video.js_play = function () {
                    video.play();
                };
                video.onplay = function () {
                    playerWindow.js_on_play(video.id);
                    return false;
                };
                if (playerWindow.players.length == 1) {
                    video.autoplay = true;
                }
                item.appendChild(video);
            }


        };
        if (playerWindow.document.readyState === "complete") {
            fn();
        } else {
            playerWindow.addEventListener("load", fn, false);
        }

        playerWindow.focus();
        return true;
    },
};
function doMusicLinks(node) {

    var lns = [].filter.call((node || document).getElementsByTagName('a'), function (a) {
        return /\[mp3\]/.test(a.textContent);
    });
    [].forEach.call(lns, function (a) {
        var src = (a.hostname.indexOf('rghost') != -1) ? "http://rghost.ru/download/action/" + a.href.match(/\d+$/) + "/mp3" : a.href;
        a.onclick = function () {
            muPlayer.add(a.href, src, a.innerHTML.substr(5).replace(/^\s+/, '').replace(/\s+$/, '') || a.href);
            return false;
        };
    });
}

function doVocaroo(root) {

    var lns = [].filter.call(
            (root || document).getElementsByTagName('a'), function (a) {
        return /^https?:\/\/vocaroo\.com\/i\//i.test(a.href);
    });
    [].forEach.call(lns, function (a) {
        var matches = /\/i\/([a-zA-Z0-9]+)/.exec(a.href);
        var id = matches[1];
        a.title = txt[lang]['js_click_vocaroo'];
        a.style.borderBottom = '1px dotted #FF6600';
        a.onclick = function () {
            toggle(a);
            var span = document.createElement('span');
            span.className = 'shortened';
            span.innerHTML = txt[lang]['js_to_close'];
            span.onclick = function () {
                swfobject.removeSWF('vocaroo_' + id);
                toggle(a);
                this.parentNode.removeChild(this);
            };
            var div = document.createElement('div');
            div.setAttribute("id", "vocaroo_" + id);
            insertAfter(a, div);
            insertAfter(div, span);
            var att = {
                data: "/x-vocaroo.swf?playMediaID=" + id + "&autoplay=1",
                width: "220",
                height: "140"
            };
            var par = {
                movie: "http://vocaroo.com/mediafoo.swf?playMediaID=" + id + "&autoplay=1",
                allowScriptAccess: "never",
                wmode: "transparent"
            };
            var obj = swfobject.createSWF(att, par, "vocaroo_" + id);
            obj.className = 'thumb';
            return false;
        };
    });
}

function doVideoLinks(el) {

    var videoplayer = function (w, h) {

        var main_div = document.createElement('div');
        main_div.className = 'thumb';
        main_div.style.display = "inline-block";
        main_div.style.width = ((w || 480) + 30) + "px";
        main_div.style.height = (h || 360) + "px";
        var exit_but = document.createElement('a');
        exit_but.href = "#";
        exit_but.style.float = "left";
        exit_but.innerHTML = txt[lang]['js_to_close'];
        exit_but.onclick = function () {
            main_div.previousSibling.style.display = '';
            $del(main_div);
            return false;
        };
        main_div.appendChild(exit_but);
        return main_div;
    };
    var generic_decorator = function (link) {
        link.title = txt[lang]['js_click_yt_link'];
        link.style.borderBottom = '1px dotted #FF6600';
    };
    var tubes = [
        {
            title: "Youtube",
            validate: function (link) {
                var short = /^https?:\/\/youtu\.be\/[^/]+/i;
                var normal = /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=[^&]+/i;
                return normal.test(link.href) || short.test(link.href);
            },
            set_handler: function (link) {
                var video_id = (/youtu\.be\/([^&?/#]+)/i.exec(link.href) || /[?&]v=([^&#]+)/i.exec(link.href))[1];
                var m = /[&?#]t=(\d+)s?/i.exec(link.href);
                var start = m ? m[1] : false;
                link.onclick = function (e) {
                    link.style.display = 'none';
                    var player = videoplayer(480, 400);
                    var iframe = $el('<iframe width="480" height="360" frameborder="0" ' + // 
                            'src="//www.youtube.com/embed/' + video_id + '?rel=0&autoplay=1&amp;fs=1' + //
                            ((start) ? '&start=' + start : '') + '"></iframe>');
                    iframe.style.float = 'left';
                    player.insertBefore(iframe, player.firstChild);
                    insertAfter(link, player);
                    return false;
                };
            },
            decorate: generic_decorator
        },
        {
            title: "Vimeo",
            validate: function (link) {
                return /^https?:\/\/vimeo\.com\/\d+$/i.test(link.href);
            },
            set_handler: function (link) {
                var video_id = /vimeo\.com\/(\d+)$/i.exec(link.href)[1];
                link.onclick = function (e) {
                    link.style.display = 'none';
                    var player = videoplayer(500, 281 + 40);
                    var iframe = $el('<iframe src="//player.vimeo.com/video/' + video_id +
                            '?title=0&amp;byline=0&amp;portrait=0&amp;color=ff9933&amp;autoplay=1" ' + //
                            'width="500" height="281" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>');
                    iframe.style.float = 'left';
                    player.insertBefore(iframe, player.firstChild);
                    insertAfter(link, player);
                    return false;
                };
            },
            decorate: generic_decorator
        },
        {
            title: "xHamster",
            validate: function (link) {
                return /^https?:\/\/xhamster.com\/movies\/\d+\/[^/]+\.html$/i.test(link.href);
            },
            set_handler: function (link) {
                var video_id = /movies\/(\d+)\//i.exec(link.href)[1];
                link.onclick = function (e) {
                    link.style.display = 'none';
                    var player = videoplayer(510, 400 + 40);
                    var iframe = $el('<iframe width="510" height="400" src="//xhamster.com/xembed.php?video=' + video_id
                            + '" frameborder="0" scrolling="no"></iframe>');
                    iframe.style.float = 'left';
                    player.insertBefore(iframe, player.firstChild);
                    insertAfter(link, player);
                    return false;
                };
            },
            decorate: generic_decorator
        },
        {
            title: "COUB",
            validate: function (link) {
                return /^http:\/\/coub\.com\/view\/[0-9a-zA-Z]{4,}\/?/i.test(link.href);
            },
            set_handler: function (link) {
                var video_id = /view\/([^/]{4,})/.exec(link.href)[1];
                link.onclick = function () {
                    link.style.display = 'none';
                    var player = videoplayer(600, 480 + 40);
                    var iframe = $el('<iframe src="https://coub.com/embed/' + video_id
                            + '?muted=false&autostart=true&originalSize=false&hideTopBar=true&startWithHD=true"'
                            + ' allowfullscreen="true" frameborder="0" width="600" height="480"></iframe>');
                    iframe.style.float = 'left';
                    player.insertBefore(iframe, player.firstChild);
                    insertAfter(link, player);
                    return false;
                };
            },
            decorate: generic_decorator
        }


        /* add handlers here          
         {
         title: "Title",
         validate: function (link) {},
         set_handler: function(link) {},
         decorate: generic_decorator
         } */
    ]; // end of tubes list

    var all_links = (el || document.forms['delform'] || document).getElementsByTagName('a');
    [].forEach.call(all_links, function (link) {
        tubes.forEach(function (tube) {
            if (tube.validate(link)) {
                tube.set_handler(link);
                tube.decorate(link);
            }
        });
    });
}

function doCodeHighlight(root) {
// helper
    var loadering;
    var process = function (code) {

        if (!code.parentNode.className) {
            code.parentNode.className = 'lang-clike'; // default
        } else if (code.parentNode.className != "" && code.parentNode.className.substring(0, 4) != 'lang') { // add prefix
            code.parentNode.className = 'lang-' + code.parentNode.className;
        } else if (code.parentNode.className == "lang-js") {
            code.parentNode.className = "lang-javascript";
        }

        code.parentNode.className += " line-numbers";
        if (!window.Prism && !loadering) {
            loadering = true;
            addScript('/js/prism.js');
            addStyle('/css/prism.css');
        }

        wait(function () {
            if (window.Prism)
                return true;
        }, function () {
            window.Prism.highlightElement(code);
        });
    };
    [].forEach.call((root || document).getElementsByTagName('code'), function (code) {
        if (code.parentNode.tagName == 'PRE') {
            process(code);
        }
    });
}

function aj_get_binary(url, fn, o) {
    var xhr2_arraybuffer = new XMLHttpRequest();
    xhr2_arraybuffer.open('GET', url, true);
    xhr2_arraybuffer.responseType = 'arraybuffer';
    xhr2_arraybuffer.onreadystatechange = function (e) {
        if (this.readyState == 4) {
            if (this.status == 200) {
                fn(this.response);
            }
        }
    };
    xhr2_arraybuffer.send();
}


function rotator(el) { // svistelka
    var sprite = '/-\\|';
    var str = el.innerHTML;
    var ch = el.innerHTML.charAt(str.length - 1);
    el.innerHTML = str.substring(0, str.length - 1) +
            function () {
                if (sprite.indexOf(ch) == sprite.length - 1) {
                    return sprite.charAt(0);
                } else
                    return sprite.charAt(sprite.indexOf(ch) + 1);
            }();
}

function doArchiveThread() {

    if (!window.JSZip) {
        addScript("/js/jszip.js", doArchiveThread);
        return;
    }

    if (JSZip.support.blob || JSZip.support.base64) {
    }
    else {
        alert("В браузере нет поддержки нужных функций");
        return;
    }

    if (!window.saveAs) {
        addScript("/js/FileSaver.js", doArchiveThread);
        return;
    }

    var msgbox = document.getElementById("archiver");
    if (msgbox) {
        alert("Дождитесь завершения сохранения треда!");
        return;
    }

    var msgbox, log_box, dl_button;
    msgbox = document.createElement('div');
    msgbox.style.position = 'fixed';
    msgbox.style.top = '2em';
    msgbox.style.right = '2em';
    msgbox.id = "archiver";
    msgbox.className = "reply";
    msgbox.style.padding = '.5em';
    msgbox.style.width = "300px";
    msgbox.style.minHeight = "400px";

    var closer = document.createElement("span");
    closer.innerHTML = "Закрыть [X]";
    closer.onclick = function () {
        if (wait) {
            window.clearInterval(wait);
        }
        $del(msgbox);
    };
    closer.style.position = 'relative';
    closer.style.float = "right";
    closer.style.cursor = "pointer";
    closer.style.top = ".5em";
    closer.style.right = ".5em";
    msgbox.appendChild(closer);

    msgbox.appendChild($el("<h3>Сохранение треда</h3>"));

    var status_line = $el("<h4>начинаем...</h4>");
    msgbox.appendChild(status_line);

    log_box = document.createElement('div');
    log_box.style.backgroundColor = '#eee';
    log_box.style.fontSize = ".8em";
    log_box.style.padding = '.3em';
    log_box.style.minHeight = '300px';
    log_box.style.maxHeight = '300px';
    log_box.style.overflow = "auto";

    msgbox.appendChild(log_box);
    dl_button = document.createElement('a');
    dl_button.href = "#";
    dl_button.innerHTML = "Архив не готов";
    msgbox.appendChild(dl_button);
    document.body.appendChild(msgbox);

    var logItem = function () {
        var p = document.createElement("div");
        log_box.appendChild(p);
        return {
            say: function (str) {
                p.innerHTML = str;
                return this;
            }
        };
    };

    var zip = new JSZip();

    var pending = 0;
    var zip_pending = 0;

    var urls = [];
    var files = [];

    var url_log = logItem();
    url_log.say = 'Формирование списка файлов..';
    // fetch file urls

    [].forEach.call(document.getElementsByClassName("thumb"), function (th) {
        urls.push({src: th.src, path: th.src.replace(/^.*(thumb\/.*)$/i, "$1")}); // thumb
        urls.push({src: th.parentNode.href, path: th.parentNode.href.replace(/^.*\/(src\/.*)$/i, "$1")}); // src

        pending += 2;
        zip_pending += 2;
    });

    [].forEach.call(document.getElementsByTagName('script'), function (script) {
        if (script.src) {
            if (/jszip|FileSaver|pushstream/.test(script.src)) {
                return false;
            }
            urls.push({src: script.src, path: script.src.replace(/^.*\/(js\/.*)$/i, "$1")});
            pending += 1;
            zip_pending += 1;
        }
    });

    [].forEach.call(document.getElementsByTagName('link'), function (link) {
        if (link.rel == 'stylesheet' && /\.css$/.test(link.href)) {
            urls.push({src: link.href, path: link.href.replace(/^.*\/(css\/.*)$/, "$1")});
            pending += 1;
            zip_pending += 1;
        }
    });

    url_log.say = 'Формирование списка файлов.. Готово.';

    // html page 
    pending += 1;
    zip_pending += 1;

    $get(document.location.href, function (str) {
        pending -= 1;
        files.push({
            path: location.pathname.replace(/^.*\/(\d+\.html)$/, "$1"),
            content: str.replace(/(src|href)\=\"\/(js|css)/g, "$1=\"./$2") // 
                    .replace(/(src|href)\=\"\/[a-zA-Z0-9]+\/(src|thumb)/g, "$1\=\"./$2") //
                    .replace(/(src|href)\=\"\/[a-zA-Z0-9]+\/res/g, "$1\=\".")
        });
    });

    var do_dl = function () {
        var url = urls.pop();
        if (url === undefined) {
            dlthreads -= 1;
            return;
        }
        // download
        //
        var flogger = logItem();
        flogger.say = 'Скачивание файла ' + url.path;
        aj_get_binary(url.src, function (str) {
            files.push({
                path: url.path,
                content: str
            });
            flogger.say = 'Скачивание файла ' + url.path + " [OK]";
            pending -= 1;
            do_dl(); // recur
        });
    };
    var do_zip = function () {
        var zfile = files.pop();
        if (zfile === undefined) {
            zipthreads -= 1;
            return;
        }
        var zlogger = logItem();
        zlogger.say("Добавление в архив файла " + zfile.path);
        zip.file(zfile.path, zfile.content);
        zlogger.say("Добавление в архив файла " + zfile.path + " [OK]");
        zip_pending -= 1;
        do_zip(); // recur
    };
    var dlthreads = 0;
    var zipthreads = 0;

    var wait = window.setInterval(function () {
        status_line.innerHTML = "DL: " + pending + "; Zip: " + zip_pending;
        // start threads
        if (urls.length > 0 && dlthreads <= 4) {
            dlthreads += 1;
            do_dl();
        }

        if (files.length > 0 && zipthreads <= 4) {
            zipthreads += 1;
            do_zip();
        }

        if (pending > 0 || zip_pending > 0) {
            return; //continue 
        }
        window.clearInterval(wait);
        //return;

        // ready now
        status_line.innerHTML = "Подготовка архива";


        //try { // good
        var today = new Date();
        var th_id = document.location.href.replace(/^.*\/(\d+)\.html$/, "$1");
        var filename = "2chru.net_" + brd + "_" //
                //+ today.toLocaleFormat('%d-%m-%Y') //
                + "_No." + th_id + "_" //
                + "_(" + document.title.replace(/[^ \Wa-zA-Z0-9\u0400-\u04FF]/ig, "") //
                .substring(0, 20) + ").zip"; // (subject?)

        if (JSZip.support.blob) {
            dl_button.onclick = function () {
                try {
                    var blob = zip.generate({type: "blob"});
                    saveAs(blob, filename);
                } catch (e) {
                    dl_button.innerHTML += " " + e;
                }
                return false;
            };
            status_line.innerHTML = "готово";
            dl_button.innerHTML = "скачать";
        } else
        if (JSZip.support.base64) {
            dl_button.onclick = function () {
                window.location = "data:application/zip;base64," + zip.generate({type: "base64"});
            };
            status_line.innerHTML = "готово";
            dl_button.innerHTML = "скачать (base64)";
        }


    }, 300);
}

function doStyleSW() {
    var container = document.getElementById("style_sw");
    if (!container) {
        return false;
    }
    var added = 0;
    var add_sw = function (title) {
        var el = $el("<span> [<a href=\"#\" onclick=\"set_stylesheet_frame('" + title + "', 'list')\">" + title + "</a>] </span>");
        container.appendChild(el);
        added += 1;
    };
    var styles = [];
    [].forEach.call(
            [].filter.call(document.getElementsByTagName("link"), function (link) {
        var rel = link.getAttribute("rel");
        var title = link.getAttribute("title");
        if (rel.indexOf("style") != -1 && title) {
            return true;
        }
        return false;
    }), function (link) {
        styles.push(link.title);
    });
    if (styles.length > 1) {
        styles.map(add_sw);
    }

    if (added > 0) {
        container.appendChild(document.createTextNode(" - "));
    }

}

function doDraftsIndex() {
    [].forEach.call(document.links, function (a) {
        var m = /res\/(\d+)\.html/i.exec(a.href);
        if (m && /eply|твет/.test(a.innerHTML)) {
            if (window.localStorage && window.localStorage.getItem("draft_" + brd + "_" + m[1])) {
                insertAfter(a.nextSibling, $el('<span class="thumbnailmsg">(' + txt[lang]['saved_draft'] + ')</span>'));
            }
        }
    });
}

function doTriangles() {

    var form = document.forms['postform'];
    var parent0 = form.parent.value;
    var new_thread_hint = function () {
        var els = form.subject.parentNode.getElementsByTagName('em');
        if (els && /new|нов/i.test(els[els.length - 1].innerHTML)) {
            return els[els.length - 1];
        }
        return false;
    }();
    var anoko = function () {
        if (form.noko) {
            return false;
        }
        var anoko = $el('<span><input type="checkbox" name="noko">&nbsp;<em>(' + txt[lang]['js_to_thread'] + ')</em><span>');
        anoko.style.display = 'none';
        form.subject.parentNode.parentNode.getElementsByTagName('td')[1].appendChild(anoko); // insert
        return anoko;
    }();
    var a = document.createElement('a');
    a.href = "#";
    if (/res/.test(document.location.href)) {
        a.innerHTML = txt[lang]['js_reply'];
    }
    else {
        a.innerHTML = txt[lang]['js_new_thread'];
    }
    a.style.display = 'none';
    a.onclick = function () {
        a.style.display = 'none';
        form.parent.value = parent0;
        if (new_thread_hint) {
            new_thread_hint.style.display = '';
        }
        if (anoko) {
            anoko.style.display = 'none';
        }
        insertAfter(a, form);
        return false;
    };
    insertAfter(form, a);
    var get_parent = function (td) {
        return [].filter.call(td.getElementsByTagName('a'), function (a) {
            return a.parentNode.className == 'reflink';
        }).shift().href.replace(/^.*res\/(\d+).html.*$/, "$1");
    };
    var triangle = function (td) {
        var div = document.createElement('div');
        div.className = 'triangle';
        div.title = "Мне нравится ♥";
        div.onclick = function () {
            if (a.style.display === 'none') {
                a.style.display = '';
            }
            if (new_thread_hint && new_thread_hint.style.display === '') {
                new_thread_hint.style.display = 'none';
            }
            var parent = get_parent(td);
            if (parent !== form.parent.value) {
                form.parent.value = parent;
                load_draft(form);
            }
            if (anoko && parent != 0) {
                anoko.style.display = '';
            }

            insertAfter(td.parentNode.parentNode.parentNode, form);
            highlight(td.id.replace(/^reply(\d+)$/, "$1"));
        };
        td.appendChild(div);
        td.style.position = 'relative';
    };
    [].forEach.call(document.getElementsByClassName('reply'), triangle);
    window.add_triangle = function (root) {
        [].forEach.call(root.getElementsByClassName('reply'), triangle);
    }; // export
}

function setQuotesHandler(root) {
    [].forEach.call(
            [].filter.call((root || document).getElementsByTagName('a'), function (a) {
        return a.parentNode.className == 'reflink' && /res\/\d+\.html#\d+$/.test(a.href);
    }), function (a) {
        a.onclick = function () {
            var m = /res\/(\d+)\.html#(\d+)$/.exec(a.href);
            if (m[1] == document.forms.postform.parent.value) {
                quote(m[2]);
                return false;
            }
            if (window.localStorage) {
                var sel = getSelectedText() || "";
                window.localStorage.setItem("tmpquote", JSON.stringify({postid: m[2], text: sel}));
            }
            return true;
        };
    });
}

function setHighlightsHandler(root) {
    [].forEach.call((root || document).getElementsByTagName('a'), function (a) {
        var m = /res\/\d+\.html#(\d+)$/.exec(a.href);
        if (m && a.parentNode.className !== 'reflink') {
            a.onclick = function () {
                return highlight(m[1]);
            };
        }
    });
}

function detectKostyl() {
    if (document.getElementById("de-css")) {
        return true;
    }
    return false;
}

//even with dollscript
document.addEventListener("DOMContentLoaded", function () {
    checkIn(brd); //
    doStyleSW(); //
    doStars();
}, false);
document.addEventListener("DOMContentLoaded", function () {
    if (detectKostyl()) {
        return;
    }

    if (!Settings.get("password")) {
        Settings.set("password", generate_password());
    }

    doCodeHighlight(); // 

    if (document.forms['delform']) { // есть посты
        doVideoLinks();
        doVocaroo();
        doMusicLinks();
        postModule.doParse();
        postModule.doRefPreview();
        postModule.doRefMap();
        if (index) { // index
            doTruncate(); // tl;dr posts

            if (document.location.href.indexOf('manage') == -1) {
                doShowHide(); // hide threads
            }
            doDraftsIndex();
        }
        // highlights
        setHighlightsHandler();
        //quotes
        setQuotesHandler();
    } // end
}, false);
document.addEventListener("DOMContentLoaded", function () {
    if (document.forms['postform']) {
        if (!detectKostyl()) {

            doPostForm();
            doTriangles();
        }

        if (res) { //res
            var m = /#([0-9]+)/.exec(document.location.hash);
            if (m) {
                if (localStorage && localStorage.getItem("tmpquote")) {
                    if (document.forms["postform"].message.value) {
                        insert("\n");
                    }
                    quote(m[1]);
                } else {
                    highlight(m[1]);
                }
            }
        }
    }
}, false);
document.addEventListener("DOMContentLoaded", function () {
    if (document.forms['delform']) { // both
        if (detectKostyl()) {
            return;
        }
        doExpand();
        doDelForm();
    }
}, false);
document.addEventListener("DOMContentLoaded", function () {
    if (res && document.forms['postform']) {
        if (detectKostyl()) {
            $del(document.getElementById("updated"));
            return;
        }
        doUpdateBtn();
        doArchBtn();
    }
}, false);
document.addEventListener("DOMContentLoaded", function () {
    if (detectKostyl()) {
        return;
    }
    if (touch_device) {
        [].forEach.call(
                document.getElementsByClassName("spoiler"),
                function (span) {
                    span.ontouchstart = function () {
                        span.className = 'unspoiler';
                    };
                });
    } // touch end

    // detect Opera Mini
    if (navigator.userAgent.indexOf('Opera Mini') != -1) {
        [].forEach.call(
                document.getElementsByClassName("spoiler"),
                function (span) {
                    span.className = 'unspoiler';
                });
    }

}, false);
document.addEventListener('DOMContentLoaded', function () {
    if (detectKostyl()) {
        return;
    }
    var captcha_image = document.getElementById("captchaimage");
    if (captcha_image) {
        captcha_image.onclick = function () {
            update_captcha(this);
            document.getElementsByName('captcha')[0].focus();
            return false;
        }
    }
}, false);
window.addEventListener('load', function () {

    var m = /\/res\/(\d+)\.html/i.exec(document.location.href);
    if (!m || detectKostyl()) {
        return false;
    }

    var res_chan = "2chru_" + brd + "_res_" + m[1];
    addScript('/js/pushstream.js', function () {
        var pushstream = new PushStream({
            host: window.location.hostname,
            port: window.location.port,
            modes: "eventsource|longpolling",
            useSSL: (location.protocol === "https:"),
            urlPrefixEventsource: '/comet/ev',
            urlPrefixLongpolling: '/comet/lp'
        });
        pushstream.onmessage = function (text, id, channel) {
            if (channel === res_chan) {
                postModule.showNewPosts(document.getElementById('updated'));
            }
        };
        pushstream.addChannel(res_chan);
        pushstream.connect();
    });
});
