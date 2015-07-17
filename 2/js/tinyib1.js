var postModule = function() {
    var postByNum = [];
    var ajaxPosts = {};
    var refArr = [];

    var AJAX = function(b, id, fn) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState != 4)
                return;
            if (xhr.status == 200) {
                var adoc = createDocument(xhr.responseText, 'test');

                var delform = adoc.getElementById('delform');
                var html = delform.innerHTML;
                var tNum = /\<a id\=\"(\d+)\"\>/i.exec(html)[1];
                ajaxPosts[tNum] = {
                    keys: []
                };
                ajaxPosts[tNum].keys.push(tNum);
                ajaxPosts[tNum][tNum] = html.substring(0, html.search(/.(?=\<table|<div\sclass\=\"clear)/i) - 1);

                $each(adoc.evaluate('.//td[@class="reply" or "reply highlight"]', adoc, null, 6, null), function(post) {
                    var pNum = post.id.match(/\d+/);
                    ajaxPosts[tNum].keys.push(pNum);
                    ajaxPosts[tNum][pNum] = post.innerHTML;
                });

                // карта ответов 
                $each(adoc.evaluate('.//blockquote//a[starts-with(text(),">>")]', adoc, null, 6, null), function(link) {
                    if (/^\>\>\d+$/.test(link.textContent)) {
                        var rNum = link.getAttribute('href').match(/\d+$/).toString(); // куда ссылается
                        if (!rNum)
                            return;
                        var post = adoc.evaluate('ancestor::td', link, null, 8, null).singleNodeValue; // ссылающийся пост
                        if (post && (postByNum[rNum] || ajaxPosts[tNum][rNum])) {
                            getRefMap(post.id.match(/\d+/), rNum);
                        }
                    }
                });

                fn();
            } else
                fn('HTTP ' + xhr.status + ' ' + xhr.statusText);
        };
        xhr.open('GET', '/' + b + '/res/' + id + '.html', true);
        xhr.send(false);
    };

    var delPostPreview = function(e) {
        var el = $x('ancestor-or-self::*[starts-with(@id,"pstprev")]', e.relatedTarget);
        if (!el)
            $each($X('.//div[starts-with(@id,"pstprev")]'), function(clone) {
                $del(clone);
            });
        else
            while (el.nextSibling)
                $del(el.nextSibling);
    };

    var showPostPreview = function(e) {
        var tNum = this.pathname.substring(this.pathname.lastIndexOf('/')).match(/\d+/);
        var pNum = this.hash.match(/\d+/) || tNum;
        var brd = this.pathname.match(/[^\/]+/); // for cross board links
        var html = document.documentElement;
        var body = document.body;
        var x = e.clientX + (html && html.scrollLeft || body && body.scrollLeft || 0) + 1;
        var y = e.clientY + (html && html.scrollTop || body && body.scrollTop || 0) - (html.clientTop || 0);
        //var x = e.clientX + document.body.scrollLeft - document.body.clientLeft + 1;
        //var y = e.clientY + document.body.scrollTop - document.body.clientTop;
        var cln = document.createElement('div');
        cln.id = 'pstprev_' + pNum;
        cln.className = 'reply';
        cln.style.cssText = 'position:absolute; z-index:950; border:solid 1px #575763; top:' + y + 'px;' + (x < document.body.clientWidth / 2 ? 'left:' + x + 'px' : 'right:' + parseInt(document.body.clientWidth - x + 1) + 'px');
        cln.addEventListener('mouseout', delPostPreview, false);
        var aj = ajaxPosts[tNum];
        var functor = function(cln) {
            doRefPreview(cln);
            doExpand(cln);
            doVideoLinks(cln);
            doVocaroo(cln);
            doMusicLinks(cln);
            doHighlight(cln);

            //doStars(cln);
            //if(!$x('.//small', cln) && ajaxPosts[tNum] && ajaxPosts[tNum][pNum] && refArr[pNum])
            //if (!$x('.//small', cln) && refArr[pNum]) {
            if (refArr[pNum]) {
                showRefMap(cln, pNum, tNum);
            }
        };
        cln.innerHTML = txt[lang]['js_Loading'];
        if (postByNum[pNum]) {
            cln.innerHTML = postByNum[pNum];
            functor(cln);
        } else {
            if (aj && aj[pNum]) {
                cln.innerHTML = aj[pNum];
                functor(cln);
            } else {
                AJAX(brd, tNum, function(err) {
                    cln.innerHTML = err || ajaxPosts[tNum][pNum] || 'Пост не найден';
                    functor(cln);
                });
            }
        }
        //$del(document.getElementById(cln.id)); // WTF
        document.forms['delform'].appendChild(cln);
    };

    var showNewPosts = function(btn) {
        var tNum = location.pathname.substring(location.pathname.lastIndexOf('/')).match(/\d+(?=\.html)/);
        var brd = location.pathname.match(/[^\/]+/);
        var tell = btn ?
                function(str) {
                    btn.innerHTML = str;
                } : function() {
        };
        tell(txt[lang]['js_wait_a_sec']);
        AJAX(brd, tNum, function(err) {
            if (err) {
                return;
            }

            var pNum;
            var updated = false;
            for (var i = 0; i < ajaxPosts[tNum].keys.length; i += 1) {
                pNum = ajaxPosts[tNum].keys[i];
                if (!postByNum[pNum] && pNum != tNum) {
                    var dummy = document.createElement('div');
                    dummy.innerHTML = '<table><tbody><tr><td class="doubledash"> >> </td><td class="reply" id="reply' + pNum + '"> <a id="' + pNum + '"></a> ' + ajaxPosts[tNum][pNum] + '</td></tr></tbody></table>';
                    cln = dummy.firstChild;
                    document.forms['delform'].insertBefore(cln, $x('.//div[@class="clear"]') || $x('.//br[@class="clear"]'));
                    updated = true;

                    postByNum[pNum] = ajaxPosts[tNum][pNum];
                    doRefPreview(cln);
                    doExpand(cln);
                    doVideoLinks(cln);
                    doVocaroo(cln);
                    doMusicLinks(cln);
                    doHighlight(cln);
                }
            }
            if (!updated) {
                tell(txt[lang]['js_no_new_posts']);
            } else {
                checkIn(brd);
            }
            setTimeout(function() {
                tell(txt[lang]['js_update_thread']);
            }, 700);
            $each($X('.//td[@class="reply highlight"]', document.forms["delform"]), function(cell) {
                cell.className = "reply";
            });
            doRefMap();
        });
    };

    var doRefPreview = function(node) {
        $each($X('.//a[starts-with(text(),">>")]', node || document), function(link) {
            // kostyl
            link.textContent = link.textContent.replace(/[\u00AD\u002D\u2011]+/g, "");
            if (/^\>\>(?:\/?\S{1,4}\/)?\d+$/.test(link.textContent)) {
                link.addEventListener('mouseover', showPostPreview, false);
                link.addEventListener('mouseout', delPostPreview, false);
            }
        });
    };

    var showRefMap = function(post, pNum, tNum) {
        var ref = refArr[pNum].toString().replace(/(\d+)/g, '<a href="' + (tNum ? '/' + brd + '/res/' + tNum + '.html#$1' : '#$1') + '" onclick="highlight($1); return false;">&gt;&gt;$1</a>');
        var map = document.createElement('div');
        map.id = 'rfmap_' + pNum;
        map.className = "small";
        map.innerHTML = '<i class="abbrev">&nbsp;' + txt[lang]['js_replies'] + ': ' + ref + '</i><br />';
        doRefPreview(map);
        var oldmap = post ? $x('.//div[@class="small"]', post) : document.getElementById('rfmap_' + pNum);
        if (oldmap)
            $del(oldmap);
        if (post)
            post.appendChild(map);
        else {
            var el = $x('.//a[@id="' + pNum + '"]');
            while (el.tagName != 'BLOCKQUOTE')
                el = el.nextSibling;
            el.parentNode.insertBefore(map, el.nextSibling);
        }
    };

    var getRefMap = function(pNum, rNum) { // populating refArr
        if (!refArr[rNum])
            refArr[rNum] = pNum;
        else if (refArr[rNum].toString().indexOf(pNum) == -1)
            refArr[rNum] = refArr[rNum] + ', ' + pNum; // pizdec
    };

    var doRefMap = function() {
        $each($X('.//blockquote//a[starts-with(text(),">>")]'), function(link) {
            if (/^\>\>(?:\/?\S{1,4}\/)?\d+$/.test(link.textContent)) {
                var rNum = link.hash.match(/\d+/);
                if (!rNum)
                    return;
                var post = $x('ancestor::td', link); // ссылающийся пост
                if ((postByNum[rNum] || ajaxPosts[rNum] || $x('.//a[@id="' + rNum + '"]')) && post) {
                    getRefMap(post.id.match(/\d+/), rNum);
                }
            }
        });
        for (var rNum in refArr) {
            var post = document.getElementById('reply' + rNum); // пост, на кот указывает ссылка
            showRefMap(post, rNum);
        }
    };

    function doParse() {
        // HAIL TO HANUU!
        var x = document.body.innerHTML;
        var threads = x.substring(x.search(/<form[^>]+del/) + x.match(/<form[^>]+del[^>]+>/).toString().length, x.indexOf('userdelete">') - 13).split(/<(?:br|div)\s+class="clear"[\s</div>]*<h[r\s\/]*>/i);
        for (var i = 0, tLen = threads.length - 1; i < tLen; i++) {
            var tNum = threads[i].match(/<input[^>]+checkbox[^>]+>/i)[0].match(/(?:")(\d+)(?:")/)[1];
            postByNum[tNum] = threads[i].substring(0, threads[i].indexOf('<table>') - 7);
        }

        $each($X('.//td[@class="reply" or "reply highlight"]'), function(post) {
            postByNum[post.id.match(/\d+/)] = post.innerHTML;
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
        'js_post_too_long': "Пост слишком длинный. Нажмите здесь, чтобы прочитать его полностью.",
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
        'chk_cap_fail': 'неверно'
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
        'chk_cap_fail': 'incorrect'
    }
};

function doUpdateBtn() {
    var btn = document.getElementById("updated");
    btn.style.margin = "0 .5em";
    btn.onclick = function() {
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
    btn.onclick = function() {
        doArchiveThread();
        return false;
    };
    insertAfter(ref, btn);
}


function update_captcha(img) {
    img = img || document.getElementById('captchaimage');
    img.alt = txt[lang]['js_working'];
    img.src = img.src.replace(/\?.+$/, '') + "?" + Math.floor(Math.random() * 10000000).toString();
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
        var recur = function(node) {
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
    var textarea = document.forms["postform"].message;
    var theSelection = getSelectedText() || '';
    if (theSelection != '') {
        var strings = theSelection.split("\n");
        for (var i = 0; i < strings.length; i += 1) {
            strings[i] = strings[i].replace(/^\s+/, '').replace(/\s+$/, '').replace(/^[>]/, ' >');
            if (strings[i] == '') {
                strings.splice(i, 1);
                i -= 1;
            }
        }
        if (textarea.value.indexOf('>>' + postid) == -1) {
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
    var highlights = document.getElementsByClassName('highlight');
    for (var i = 0; i < highlights.length; i += 1) {
        highlights[i].className = 'reply';
    }
    var reply = document.getElementById("reply" + post);
    if (reply) {
        reply.className = "reply highlight";
        document.location.hash = post.toString(); // force jump to anchor
        return false;
    }
    return true;
}

function invertAll(formid, inputname) {
    $each($X('.//input[@name="' + inputname + '"]', document.forms[formid]), function(checkbox) {
        checkbox.checked = checkbox.checked ? false : true;
    });
}

function toggle(node) {
    node.style.display = (node.style.display != 'none' ? 'none' : '');
}

function doTruncate() {
    $each($X('.//td[@class="reply"]/blockquote | .//form/blockquote'), function(block) {
        var height = block.offsetHeight;
        if (height - 250 > 50) {
            block.style.overflowY = 'hidden';
            block.style.setProperty("height", "250px", "important");
            var a = document.createElement("span");
            a.className = "shortened";
            a.innerHTML = "&nbsp;" + txt[lang]['js_post_too_long'];
            a.onclick = function() {
                toggle(this);
                toggle(b);
                block.style.setProperty("height", "auto", "important");
            };

            insertAfter(block, a);

            var b = document.createElement("span");
            b.style.display = "none";
            b.className = "shortened";
            b.innerHTML = "&nbsp;" + txt[lang]['js_thanks_take_it_back'];
            b.onclick = function() {
                toggle(this);
                toggle(a);
                block.style.setProperty("height", "200px", "important");
            };

            insertAfter(block, b);
        }
    });
} //

function doExpand(node) {
    $each($X('.//img[@class="thumb"]', node || document), function(img) { // expand pics and stuff
        var a = img.parentNode;
        var id = img.getAttribute("id").substr(5); // post id
        if (/\.jpe?g|\.png|\.gif/i.test(a.href)) { // images
            var maxwidth = document.body.clientWidth - ((a.parentNode.tagName == 'TD') ? 100 : 60); // podporka
            var th_src = img.src.toString();
            img.style.maxWidth = maxwidth + 'px';
            var loadering, preloaded;

            a.onclick = function() {
                var progress = document.createElement("div");
                progress.style.position = "absolute";
                progress.style.margin = "6px 24px";
                progress.style.backgroundColor = window.getComputedStyle(node || document.body).getPropertyValue('background-color');
                a.appendChild(progress);
                var clear = function() {
                    if (progress.parentNode)
                        setTimeout(function() {
                            a.removeChild(progress);
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

                    preloaded.addEventListener('cancel', function(e) {
                        window.clearInterval(interval);
                        loadering = false;
                        preloaded.onerror = function() {
                        }; // kostyl iz govna
                        preloaded.src = '';
                        preloaded = false;
                        progress.innerHTML = txt[lang]['js_loadering_cancelled'];
                        clear();
                    }, false);

                    preloaded.onload = function(e) {
                        loadering = false;
                        window.clearInterval(interval);
                        img.src = preloaded.src;
                        progress.innerHTML = txt[lang]['js_expanded'];
                        clear();
                    }

                    preloaded.onerror = function(e) {
                        window.clearInterval(interval);
                        loadering = false;
                        preloaded.src = '';
                        preloaded = false;
                        progress.innerHTML = txt[lang]['js_err_occured'];
                        clear();
                    };

                    progress.innerHTML += " /";
                    var interval = setInterval(function() {
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
            a.onclick = function() {
                toggle(img);

                var span = document.createElement('span');
                span.className = 'shortened';
                span.innerHTML = txt[lang]['js_to_close'];
                span.onclick = function() {
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
            a.onclick = function() {
                var info = function() {
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
        else if (/^webmAV[_]/.test(a.id)) { // normal video

            a.onclick = function() {
                toggle(img);
                var video = document.createElement('video');
                video.className = 'thumb';
                video.src = a.href;
                video.controls = true;
                video.autoplay = true;
                video.volume = 0.5;
                var span = document.createElement('span');
                span.className = 'shortened';
                span.innerHTML = txt[lang]['js_to_close'];
                span.style.float = "left";
                span.onclick = function() {
                    $del(video);
                    $del(span);
                    toggle(img);
                };

                insertAfter(a, span);
                insertAfter(a, video);

                return false;
            };
        }
        else if (/^webmV[_]/.test(a.id)) { // pseudo gif
            // autoloop
            // no controls
            // close onclick
            a.onclick = function() {
                toggle(img);
                var dummy = document.createElement('div');
                dummy.innerHTML = '<video src="' + a.href + '" class="thumb" autoplay muted loop ></video>';
                var video = dummy.firstChild;
                video.onclick = function() {
                    toggle(img);
                    $del(video);
                };
                insertAfter(a, video);
                return false;
            };

        }
        else if (/^webmA[_]/.test(a.id)) { // audio track
            // send to player
            a.onclick = function() {
                muPlayer.add(id, a.href, txt[lang]['js_file_from_post_no'] + id);
                return false;
            };

        }
    });
}

function doShowHide() {
    var save = function(obj) {
        Settings.set('hidden', JSON.stringify(obj));
    };
    var json = Settings.get('hidden');
    if (!json)
        return;

    window.showhide = function() {
        var elems = document.forms['delform'].children;
        var id = 0;
        var collection = [];
        var threads = [];
        var threadById = [];

        var helper = function(id) { // showhide button does
            return function() {
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

        return function(id) {
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
    form.password.value = Settings.get("password");
}

function doPostForm() {
    var form = document.forms['postform'];
    var fieldset = document.getElementById("postform-fieldset");
    var res = (-1 != document.location.href.indexOf('/res/'));
    var noko = form.noko;

    form.password.value = Settings.get("password");
    form.name.value = Settings.get("name") || '';
    form.email.value = Settings.get("email") || '';
    form.name.onchange = function() {
        Settings.set("name", form.name.value);
    }
    form.email.onchange = function() {
        Settings.set("email", form.email.value);
    }

    if (form.file) {
        var clfile = document.createElement('span');
        clfile.className = 'shortened';
        clfile.style.display = 'none';
        clfile.onclick = function() {
            form.file.value = null;
            clfile.style.display = 'none';
        };
        clfile.innerHTML = ' x ';
        clfile.title = txt[lang]['js_clear_file'];
        insertAfter(form.file, clfile);
        form.file.onchange = function() {
            clfile.style.display = '';
        }
    }

    if (form.captcha) {
        var clcap = document.createElement("span");
        clcap.className = 'shortened';
        clcap.style.display = 'none';
        clcap.style.margin = "0 .5em";
        clcap.innerHTML = txt[lang]['chk_cap_btn'];
        clcap.onclick = function() {
            var cap = form.captcha.value.toString();
            $post("/" + brd + "/api/validate-captcha", function(str) {
                var data = JSON.parse(str);
                if (data.status == 'ok') {
                    clcap.innerHTML = txt[lang]['chk_cap_ok'];
                } else {
                    clcap.innerHTML = txt[lang]['chk_cap_fail'];
                    setTimeout(function() {
                        clcap.innerHTML = txt[lang]['chk_cap_btn'];
                    }, 700);
                }
            }, "captcha=" + encodeURI(cap));
        };
        insertAfter(form.captcha, clcap);

        form.captcha.onfocus = function() {
            clcap.style.display = "";
        };
    }
    var captcha_required = undefined;
    // SET form target
    // fake-ajax 
    if (!IE) {
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'about:blank';
        form.target = iframe.name = iframe.id = 'postframe';
        document.body.appendChild(iframe);
        iframe.onload = function() {
            var idoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!idoc || !idoc.body || !idoc.body.innerHTML) {
                return false;
            }
            var h1 = idoc.getElementsByTagName('h1')[0];
            if (h1 && (h1.innerHTML.indexOf(txt[lang]['js_error']) != -1)) {
                var msg = idoc.getElementsByTagName('h2')[0].textContent || idoc.getElementsByTagName('h2')[0].innerHTML;
                alert(msg);
                update_captcha(document.getElementById("captchaimage")); // refresh
            } else if (h1 && (h1.innerHTML.indexOf(txt[lang]['js_redirecting']) != -1)) {

                var meta = idoc.getElementsByTagName('meta')[0];
                if (res && noko.checked) {
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
                    intervalID = window.setInterval(function() {
                        if ((window.frames.main || window).highlight(insert_id) == false)
                            window.clearInterval(intervalID)
                    }, 100);
                } else {
                    document.location.href = meta.content.match(/url[=](.+)$/)[1];
                }
            }
            postering = false;
            idoc.location.replace('about:blank');
        };
    } // fake-ajax end

    var captcha_challenge = function() {
        document.getElementById("captcha_tr").style.display = "table-row";
        form.captcha.focus();
    };

    var requires_captcha = function() {
        $get("/" + brd + "/api/requires-captcha", function(response) {
            var obj = JSON.parse(response);
            captcha_required = obj['requires-captcha'];
        });

        wait(function() {
            return (captcha_required !== undefined);
        }, function() {
            if (form.onsubmit())
                form.submit();
        });
    };

    var postering = false;

    form.onsubmit = function() {

        if (postering)
            return false;
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

        if (["sage", "сажа"].indexOf(form.email.value) != -1) {
            Settings.del("email");
        }

        if (captcha_required === undefined) {
            requires_captcha();
            return false;
        }

        if (captcha_required === '1' && document.getElementById("captcha_tr").style.display != 'table-row') {
            captcha_challenge();
            return false;
        }

        if (captcha_required === '1' && document.getElementById("captcha_tr").style.display != 'none' && form.captcha.value == '') {
            alert(txt[lang]['js_enter_captcha']);
            return false;
        }

        postering = true;
        return true;
    };
}

function checkIn(brd) {
    if (!brd || !document.forms['delform'])
        return;
    var json = Settings.get('visited');
    var obj = json ? JSON.parse(json) : {};
    obj[brd] = 1 + Math.round((new Date()).getTime() / 1000);
    Settings.set('visited', JSON.stringify(obj));
}

function doStars(root) {
    var doom = function(htmlobj) {
        var life = within(3000, 5000);
        setTimeout(function() {
            $del(htmlobj);
        }, life);
    };
    var within = function(x0, x1) {
        return Math.floor(Math.random() * (x1 - x0 + 1)) + x0;
    };

    $each($X('.//span[@class="postertrip vip"]', root || document.forms['delform']), function(block) {
        setInterval(function() {
            setTimeout(function() {
                var width = block.clientWidth;
                var height = block.clientHeight;
                var star = document.createElement('img');
                star.src = '/star.gif';
                star.style.position = 'absolute';
                star.style['float'] = 'left';
                star.width = within(6, 12);
                star.style.left = within(0, width - 12 / 2) + 'px';
                star.style.top = within(0, height - 14 / 2) + 'px';
                block.appendChild(star);
                doom(star);
            }, within(1000, 1500))
        }, 1000);
    });

}
var muPlayer = {
    getWindow: function() {
        var playerWindow = window.open('', "playerWindow", "width=520,height=500,left=600,top=100,menubar=no,directories=no,location=no,resizable=yes,scrollbars=no,status=no");

        if (!playerWindow.document.getElementById('playlist')) { // new window, build stuff
            playerWindow.document.write('<html><head><title>' + txt[lang]['js_Music'] + '</title><script src="/js/swfobject.js"></script></head><body><div id="playlist"></div></body></html>');
            playerWindow.document.close();

            var list = playerWindow.document.getElementById('playlist');

            playerWindow.players = [];

            playerWindow.js_on_play = function(player_id) {
                for (var i = 0; i < playerWindow.players.length; i += 1) {
                    if (playerWindow.players[i] != player_id)
                        playerWindow.document.getElementById(playerWindow.players[i]).js_stop();
                }
            };

            playerWindow.js_on_end_track = function(player_id) {
                var next = playerWindow.players.indexOf(player_id) + 1;
                if (playerWindow.players[next])
                    playerWindow.document.getElementById(playerWindow.players[next]).js_play();
            };
        }
        return playerWindow;
    },
    add: function(id, src, info) {
        var playerWindow = this.getWindow();
        var el = playerWindow.document.getElementById('file_' + id);
        if (el) {
            return alert(txt[lang]['js_already_listed']);
        }


        var fn = function() {
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

                var autoplay = function(e) {
                    setTimeout(function() {
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
                video.onended = function() {
                    playerWindow.js_on_end_track(video.id);
                    return false;
                };
                video.js_stop = function() {
                    video.pause();
                };

                video.js_play = function() {
                    video.play();
                };

                video.onplay = function() {
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
    $each($X('.//a[starts-with(text(),"[mp3]")]', node || document), function(a) {
        var src = (a.hostname.indexOf('rghost') != -1) ? "http://rghost.ru/download/action/" + a.href.match(/\d+$/) + "/mp3" : a.href;
        a.onclick = function() {
            muPlayer.add(a.href, src, a.innerHTML.substr(5).replace(/^\s+/, '').replace(/\s+$/, '') || a.href);
            return false;
        };
    });
}

function doVocaroo(root) {
    $each($X('.//a[starts-with(@href,"http://vocaroo.com/i/") or starts-with(@href,"https://vocaroo.com/i/") ]', root || document), function(a) {
        var matches = /\/i\/([a-zA-Z0-9]+)/.exec(a.href);
        var id = matches[1];
        a.title = txt[lang]['js_click_vocaroo'];
        a.style.borderBottom = '1px dotted #FF6600';
        a.onclick = function() {
            toggle(a);
            var span = document.createElement('span');
            span.className = 'shortened';
            span.innerHTML = txt[lang]['js_to_close'];
            span.onclick = function() {
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

    var videoplayer = function(w, h) {

        var main_div = document.createElement('div');
        main_div.className = 'thumb';
        main_div.style.display = "inline-block";
        main_div.style.width = ((w || 480) + 30) + "px";
        main_div.style.height = (h || 360) + "px";

        var exit_but = document.createElement('a');
        exit_but.href = "#";
        exit_but.style.float = "left";
        exit_but.innerHTML = txt[lang]['js_to_close'];
        exit_but.onclick = function() {
            main_div.previousSibling.style.display = '';
            $del(main_div);
            return false;
        };

        main_div.appendChild(exit_but);

        return main_div;
    };

    var generic_decorator = function(link) {
        link.title = txt[lang]['js_click_yt_link'];
        link.style.borderBottom = '1px dotted #FF6600';
    };

    var tubes = [
        {
            title: "Youtube",
            validate: function(link) {
                var short = /^https?:\/\/youtu\.be\/[^/]+/i;
                var normal = /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=[^&]+/i;
                return normal.test(link.href) || short.test(link.href);
            },
            set_handler: function(link) {
                var video_id = (/youtu\.be\/([^&?/#]+)/i.exec(link.href) || /[?&]v=([^&]+)/i.exec(link.href))[1];
                var m = /[&?#]t=(\d+)s?/i.exec(link.href);
                var start = m ? m[1] : false;
                link.onclick = function(e) {
                    link.style.display = 'none';
                    var player = videoplayer(480, 400);
                    var dummy = document.createElement('div');
                    dummy.innerHTML = '<iframe width="480" height="360" frameborder="0" ' + //
                            'src="//www.youtube-nocookie.com/embed/' + video_id + '?autoplay=1&amp;fs=1' + //
                            ((start) ? '&start=' + start : '') + '"></iframe>';
                    var iframe = dummy.firstChild;
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
            validate: function(link) {
                return /^https?:\/\/vimeo\.com\/\d+$/i.test(link.href);
            },
            set_handler: function(link) {
                var video_id = /vimeo\.com\/(\d+)$/i.exec(link.href)[1];
                link.onclick = function(e) {
                    link.style.display = 'none';
                    var player = videoplayer(500, 281 + 40);
                    var dummy = document.createElement('div');
                    dummy.innerHTML = '<iframe src="//player.vimeo.com/video/' + video_id +
                            '?title=0&amp;byline=0&amp;portrait=0&amp;color=ff9933&amp;autoplay=1" ' + //
                            'width="500" height="281" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
                    var iframe = dummy.firstChild;
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
            validate: function(link) {
                return /^https?:\/\/xhamster.com\/movies\/\d+\/[^/]+\.html$/i.test(link.href);
            },
            set_handler: function(link) {
                var video_id = /movies\/(\d+)\//i.exec(link.href)[1];
                link.onclick = function(e) {
                    link.style.display = 'none';
                    var player = videoplayer(510, 400 + 40);
                    var dummy = document.createElement('div');
                    dummy.innerHTML = '<iframe width="510" height="400" src="//xhamster.com/xembed.php?video=' + video_id
                            + '" frameborder="0" scrolling="no"></iframe>';
                    var iframe = dummy.firstChild;
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
    for (var i = 0; i < all_links.length; i += 1) {
        var link = all_links[i];
        for (var j = 0; j < tubes.length; j += 1) {
            var tube = tubes[j];
            if (tube.validate(link)) {
                tube.set_handler(link);
                tube.decorate(link);
            }
        }
    }
}

function doHighlight(root) {
    var loadering = false;

    $each($X('.//pre/code', root || document.forms['delform']), function(code) {
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

        wait(function() {
            if (window.Prism)
                return true;
        }, function() {
            Prism.highlightElement(code);
        });
    });
}

function aj_get_binary(url, fn, o) {
    var xhr2_arraybuffer = new XMLHttpRequest();
    xhr2_arraybuffer.open('GET', url, true);
    xhr2_arraybuffer.responseType = 'arraybuffer';
    xhr2_arraybuffer.onreadystatechange = function(e) {
        if (this.readyState == 4) {
            if (this.status == 200) {
                fn(this.response);
            } 
        }
    };
    xhr2_arraybuffer.send();
}

function $get(url, fn) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
        fn(this.responseText);
    };
    xhr.send();
}

function $post(url, fn, data) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
        fn(this.responseText);
    };
    xhr.send(data); //data 'user=person&pwd=password&organization=place&requiredkey=key'
}


function rotator(el) { // svistelka
    var sprite = '/-\\|';
    var str = el.innerHTML;
    var ch = el.innerHTML.charAt(str.length - 1);
    el.innerHTML = str.substring(0, str.length - 1) +
            function() {
                if (sprite.indexOf(ch) == sprite.length - 1) {
                    return sprite.charAt(0);
                } else
                    return sprite.charAt(sprite.indexOf(ch) + 1);
            }();
}

function doArchiveThread() {

    var msgWindow = window.open('about:blank', "msgWindow", "width=520,height=500,left=100,top=100,menubar=no,directories=no,location=no,scrollbars=yes,resizable=yes,status=no");

    if (!msgWindow)
        return;

    msgWindow.document.writeln('<html><head><title>Сохранение треда</title></head>'
            + '<body></body></html>');
    msgWindow.document.close();

    if (!window.JSZip) {
        addScript("/js/jszip.js", doArchiveThread);
        return;
    }

    var mydiv = document.createElement("div");
    msgWindow.document.body.appendChild(mydiv);

    var logItem = function() {
        var p = document.createElement("div");
        mydiv.appendChild(p);
        return {
            say: function(str) {
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
    var thumbs = document.getElementsByClassName("thumb");
    for (var i = 0; i < thumbs.length; i += 1) {
        var th = thumbs[i];
        urls.push({src: th.src, path: th.src.replace(/^.*(thumb\/.*)$/i, "$1")}); // thumb
        urls.push({src: th.parentNode.href, path: th.parentNode.href.replace(/^.*\/(src\/.*)$/i, "$1")}); // src

        pending += 2;
        zip_pending += 2;
    }
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i += 1) {
        if (scripts[i].src) {
            urls.push({src: scripts[i].src, path: scripts[i].src.replace(/^.*\/(js\/.*)$/i, "$1")});
            pending += 1;
            zip_pending += 1;
        }
    }
    var styles = document.getElementsByTagName('link');
    for (var i = 0; i < styles.length; i += 1) {
        if (styles[i].rel == 'stylesheet' && /\.css$/.test(styles[i].href)) {
            urls.push({src: styles[i].href, path: styles[i].href.replace(/^.*\/(css\/.*)$/, "$1")});
            pending += 1;
            zip_pending += 1;
        }
    }

    url_log.say = 'Формирование списка файлов.. Готово.';

    // reduce
    logItem().say("Получение и обработка HTML страницы");
    var html = document.documentElement.innerHTML //
            .replace(/(src|href)\=\"\/(js|css)/g, "$1=\"./$2") // 
            .replace(/(src|href)\=\"\/[a-zA-Z0-9]+\/(src|thumb)/g, "$1\=\"./$2") //
            .replace(/(src|href)\=\"\/[a-zA-Z0-9]+\/res/g, "$1\=\".");
    // fetch html and replace urls to relative
    var pieces = document.location.pathname.split('/');
    var brd = pieces[1];
    var th_id = pieces[pieces.length - 1].split('.')[0];
    files.push({path: th_id + '.html', content: html});

    var do_dl = function() {
        var url = urls.pop();
        if (url === undefined) {
            dlthreads -= 1;
            return;
        }
        // download
        //
        flogger = logItem();
        flogger.say = 'Скачивание файла ' + url.path;
        aj_get_binary(url.src, function(str) {
            files.push({
                path: url.path,
                content: str
            });
            flogger.say = 'Скачивание файла ' + url.path + "OK";
            pending -= 1;
            do_dl(); // recur
        });

    };

    var do_zip = function() {
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
    var wait = window.setInterval(function() {
        msgWindow.document.title = "DL: " + pending + "; Zip: " + zip_pending;

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

        // ready now
        msgWindow.document.title = "Подготовка архива";

        var blobLink = document.createElement("a");
        blobLink.id = "bloblink";
        blobLink.innerHTML = "Подготовка архива";
        mydiv.appendChild(blobLink);
        try { // good
            var now = new Date();
            var filename = "2chru.net_" + brd + "_No." + th_id + "_" //
                    // + now.getDay() + "-" + now.getMonth() + "-" + now.getYear() // WTF
                    +
                    "_(" + document.title.replace(/[^ \Wa-zA-Z0-9\u0400-\u04FF]/ig, "").substring(0, 20) + ").zip"; // (subject?)
            blobLink.download = filename;
            blobLink.href = window.URL.createObjectURL(zip.generate({
                type: "blob"
            }));
        } catch (e) { // fine too
            msgWindow.document.title = "Base64 fallback..";
            blobLink.href = "data:application/zip;base64," + zip.generate();
        } finally {
            msgWindow.document.title = "Архив готов";
            blobLink.innerHTML = "СКАЧАТЬ";
            window.clearInterval(wait);
        }

    }, 300);

}

function doStyleSW() {

    var links = document.getElementsByTagName("link");
    var container = document.getElementById("style_sw");
    if (!container) {
        return false;
    }
    var dummy = document.createElement("div");

    var added = 0;

    var add_sw = function(title) {
        dummy.innerHTML = "<span> [<a href=\"#\" onclick=\"set_stylesheet_frame('" + title + "', 'list')\">" + title + "</a>] </span>";
        container.appendChild(dummy.firstChild);
        added += 1;
    };

    var styles = [];

    for (var i = 0; i < links.length; i += 1) {
        var rel = links[i].getAttribute("rel");
        var title = links[i].getAttribute("title");
        if (rel.indexOf("style") != -1 && title) {
            styles.push(title);
        }
    }
    if (styles.length > 1) {
        styles.map(add_sw);
    }

    if (added > 0) {
        container.appendChild(document.createTextNode(" - "));
    }

}

document.addEventListener("DOMContentLoaded", function() {
    if (!Settings.get("password")) {
        Settings.set("password", generate_password());
    }

    doVideoLinks();
    doVocaroo();

    doExpand();
    doMusicLinks();
    checkIn(brd);
    //doStars();

    doStyleSW();
    doHighlight();


    if (document.forms['delform']) { // есть посты
        postModule.doParse();
        postModule.doRefPreview();
        postModule.doRefMap();

        var match;
        if (document.location.href.indexOf('/res/') == -1) { // index
            doTruncate(); // tl;dr posts
            if (document.location.href.indexOf('manage') == -1)
                doShowHide(); // hide threads
        } else { //res
            if (match = /#([0-9]+)/.exec(document.location.hash)) {
                highlight(match[1]);
            }
            if (match = /^#i([0-9]+$)/.exec(document.location.hash)) {
                if (!document.forms["postform"].message.value) {
                    insert(">>" + match[1] + "\n");
                }
            } else {
                document.forms["postform"].noko.checked = true;
            }
        }
    } // end

    if (document.forms['postform'] && document.forms['delform']) { // both
        doPostForm();
        doDelForm();
    }
}, false);

document.addEventListener("DOMContentLoaded", function() {
    if (res && document.forms['postform'] && document.forms['delform']) {
        doUpdateBtn();
        doArchBtn();
    }
}, false);
document.addEventListener("DOMContentLoaded", function() {

    if (touch_device) {
        $each($X('.//span[@class="spoiler"]'), function(span) {

            span.ontouchstart = function() {
                span.className = 'unspoiler';
            };
            /*
             span.touchend = function() {
             span.style.backgroundColor = '#333333';
             };*/

        });
    } // touch end

    // detect Opera Mini
    if (navigator.userAgent.indexOf('Opera Mini') != -1) {
        $each($X('.//span[@class="spoiler"]'), function(span) {
            span.className = 'unspoiler';
        });
    }

}, false);

document.addEventListener('DOMContentLoaded', function() {
    var captcha_image = document.getElementById("captchaimage");
    if (captcha_image) {
        captcha_image.onclick = function() {
            update_captcha(this);
            document.getElementsByName('captcha')[0].focus();
            return false;
        }
    }
}, false);