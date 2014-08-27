jQuery(function ($, window) {
    function get_socket() {
        if (/Firefox\/\s/.test(navigator.userAgent)) {
            return io.connect({transports: ['xhr-polling']});
        }
        else if (/MSIE (\d+.\d+);/.test(navigator.userAgent)) {
            return io.connect({transports: ['jsonp-polling']});
        }
        else {
            return io.connect();
        }
    }

    var current_user = $.cookie('user'),
        other_users = 'all',
        socket = get_socket(),
        $message_list = $('.message-list'),
        $message_input = $('.message-input'),
        $reply_header = $('.user-reply-block > .header');

    function addMsg(msg, list, user) {
        user = user || '系统提示';
        var $list = $(list);
        var str = '<li><img class="avatar" src="assets/logo-30.png"/><a href="javascript:;" class="name">' +
            user + '</a><div class="msg"><span class="msg-text">' + msg + '</span></div></li>'
        $list.append(str);
        var $block = $list.parents('.message-block');
        $block.scrollTop($block.get(0).scrollHeight)
    }

    function flushUsers(users) {
        var $user_list = $('.user-list');
        var users_str = ''; //'<li title="双击聊天" onselectstart="javascript:;"><p class="user">所有人</p></li>';
        $user_list.empty();
        $.each(users, function (i, user) {
            users_str += '<li title="双击聊天"><p class="user">' + user + '</p></li>'
        });
        $user_list.append(users_str);

        //双击对某人聊天
        $user_list.dblclick(function (e) {
            var user = $(e.toElement).text();
            if (user != current_user) {
                other_users = user;
                show_say_to();
            }
        });
        show_say_to();
    }

    function play_ring(url) {
        var embed = '<embed id="ring" src="' + url + '" loop="0" autostart="true" hidden="true" style="height:0px; width:0px;0px;"></embed>';
        $("#ring").html(embed);
    }

    function getShowTime(time) {
        var dt = new Date(time);
        time = dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate() + ' ' + dt.getHours() + ':' + (dt.getMinutes() < 10 ? ('0' + dt.getMinutes()) : dt.getMinutes()) + ":" + (dt.getSeconds() < 10 ? ('0' + dt.getSeconds()) : dt.getSeconds());
        return time;
    }

    function say() {
        var $message_input = $(".message-input");
        if ($message_input.val() == "") {
            alert('不能发送空消息');
            return;
        }
        socket.emit('say', JSON.stringify({to: other_users, from: current_user, msg: $message_input.val()}));
        $message_input.val("").focus();
    }

    //显示正在对谁说话
    function show_say_to() {
        $('.current-user', $reply_header).html(current_user);
        $('.other-users', $reply_header).html(other_users == "all" ? "所有人" : other_users);
        $.each($('.user-list > li'), function (i, user) {
            if ($(user).text().trim() == other_users.trim()) {
                $(user).addClass('active');
            }
            else {
                $(user).removeClass('active');
            }
        });
    }

    socket.emit('online', JSON.stringify({user: current_user}));
    socket.on('disconnect', function () {
        var msg = '<span class="rd">连接服务器失败</span>';
        addMsg(msg, $message_list);
        $('.user-list').empty();
    });
    socket.on('reconnect', function () {
        socket.emit('online', JSON.stringify({user: current_user}));
        var msg = '<span class="rd">重新连接服务器</span>';
        addMsg(msg, $message_list);
    });
    socket.on('system', function (data) {
        var json = JSON.parse(data);
        var time = getShowTime(json.time);
        var msg = '';
        if (data.type == 'online') {
            msg += '<strong>' + data.msg + '</strong> 上线了！';
        } else if (data.type == 'offline') {
            msg += '<strong>' + data.msg + '</strong> 下线了！';
        } else if (data.type == 'in') {
            msg += '你进入了聊天室！';
        } else {
            msg += '未知系统消息！';
        }
        msg = '[' + time + ']:' + msg;
        addMsg(msg, $message_list);
        play_ring("/ring/online.wav");
    });
    socket.on('userflush', function (data) {
        data = JSON.parse(data);
        var users = data.users;
        flushUsers(users);
    });
    socket.on('say', function (msgData) {
        var time = msgData.time;
        time = getShowTime(time);
        var data = msgData.data;
        var from = data.from || current_user;
        var to = data.to || other_users;
        addMsg('[' + time + ']:' + data.msg, $message_list, from + '~>' + to);
        play_ring("/ring/msg.wav");
    });

    $(window).keydown(function (e) {
        if (e.keyCode == 116) {
            if (!confirm("刷新会将所有数据情况，确定要刷新么？")) {
                e.preventDefault();
            }
        }
    });

    $message_input.keydown(function (e) {
        if (e.shiftKey && e.which == 13) {
            say();
            e.preventDefault();
        }
    });

    $("#sendBtn").click(function () {
        say();
    });

    $("#cleanMsg").click(function () {
        $message_list.empty();
    });

    $.cookie('isLogin', true);
}(jQuery, window));
