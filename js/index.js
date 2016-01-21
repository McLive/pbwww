var API = (function(baseurl) {

    // method, args, uri
    function request(options) {
        options = options || {};

        var url = baseurl.concat(options.uri || '');

        args = $.extend({
            url: url,
            contentType: false,
            processData: false,
            dataType: 'json',
            type: options.method
        }, options.args);

        return $.ajax(args);
    }

    function _fd(data) {
        if (FormData.prototype.isPrototypeOf(data))
            return data;

        var fd = new FormData();

        $.each(data, function(key, value) {
            fd.append(key, value);
        });

        return fd;
    }

    function get(uri) {
        return request({
            method: 'GET',
            uri: uri,
            args: {
                dataType: 'text',
                accepts: "application/json, *.*",
            }
        });
    }

    function put(data, uri) {

        return request({
            method: 'PUT',
            uri: uri,
            args: {
                data: _fd(data)
            }
        });
    }

    function post(data, uri) {

        return request({
            method: 'POST',
            uri: uri,
            args: {
                data: _fd(data)
            }
        });
    }

    // paste

    function paste_delete(uuid) {

        return request({
            method: 'DELETE',
            uri: uuid
        });
    }

    // url

    function url_post(data) {

        return post(data, 'u');
    }

    //

    return {
        paste: {
            post: post,
            put: put,
            delete: paste_delete,
            get: get,
        },
        url: {
            post: url_post
        },
    }
});


var WWW = (function(undefined) {

    function alert_new() {

        var alert = $('#stash').find('.alert').clone();
        var target = $('#alert-col');

        target.append(alert);

        return alert;
    }

    function alert_title(title, message, link) {
        if (link !== undefined)
            message = $('<a>')
                .attr('href', link)
                .text(message);

        var strong = $('<strong>').text(title);

        return $('<div>').append(strong).append(': ').append(message);
    }

    function alert_simple(title, message) {
        return alert;
    }

    function clear() {

        $('input').val('');
        $('textarea').val('');
        $(':checkbox').parent()
            .removeClass('active');

        $('#content').removeClass('hidden');
        $('#filename').addClass('hidden');

        $('input, button').prop('disabled', false);
    }

    function select_file() {

        var filename = $('#file-input').prop('files')[0].name;

        $('#content').addClass('hidden');
        $('#filename').removeClass('hidden')
            .children().text(filename);

        $('#shorturl').prop('disabled', true);
    }

    function paste_data(content_only) {

        var file, content,
            fd = new FormData();

        // hmm, could support multiple file uploads at once
        file = $('#file-input').prop('files')[0];
        content = $('#content').val();

        if (file !== undefined)
            fd.append('content', file);
        else
            fd.append('content', content);

        if (content_only == true)
            return fd;

        $('.api-input:checkbox').each(function() {
            var value = + $(this).is(':checked'),
                name = $(this).attr('id');

            if (value)
                fd.append(name, value);
        })

        $('.api-input:text').each(function() {
            var value = $(this).val(),
                name = $(this).attr('id');

            if (value)
                fd.append(name, value);
        });

        return fd;
    }

    var status_keys = ['status', 'uuid', 'sunset'];

    function api_status(data) {
        console.log(data)

        var alert = alert_new();

        $.each(status_keys, function(index, key) {
            var title,
                value = data[key];

            if (value === undefined)
                return;

            if (key == 'status')
                title = alert_title(key, value, data.url);
            else
                title = alert_title(key, value);
            alert.append(title);
        });
    }

    function set_uuid(data) {

        var uuid = data.uuid;

        if (uuid === undefined)
            return;

        $('#uuid').val(uuid);
    }

    function set_content(data, xhr, id) {

        if (xhr.getResponseHeader('etag') == null) {
            try {
                api_status($.parseJSON(data));
            } catch (err) {
                console.log(err);
            }
        }

        var ct = xhr.getResponseHeader('content-type')
        if (ct.startsWith("text/")) {
            $('#content').val(data);
            return;
        } else if (ct.startsWith("image/")) {
          var link = $('<a></a>')
            .attr('href', 'https://ptpb.pw/' + id)
            .attr('target', '_blank')
            .attr('title', 'Opens in a new window');

          var img = $('<img></img>')
            .attr('src', 'https://ptpb.pw/' + id)
            .attr('height', '10%')
            .attr('width', '30%');

          alert_new().append(alert_title('image loaded', $(link).append(img)));
        } else {
            alert_new().append(alert_title('status', 'cowardly refusing to display C-T: ' + ct));
        }
    }

    function url_data() {

        return {
            content: $('#content').val()
        }
    }

    return {
        alert: alert,
        clear: clear,
        select_file: select_file,
        paste_data: paste_data,
        url_data: url_data,
        api_status: api_status,
        set_uuid: set_uuid,
        set_content: set_content
    };
});


$(function() {

    var api = API('https://ptpb.pw/');
    var app = WWW();

    function paste_submit(spinner, cb, uri, content_only) {

        spinner.removeClass('hidden');

        var fd = app.paste_data(content_only);

        xhr = cb(fd, uri).done(function(data) {
            app.api_status(data);
            app.set_uuid(data);
            spinner.addClass('hidden');
        });

        return xhr;
    }

    $('#clear').click(function(event) {
        event.preventDefault();
        app.clear();
        event.target.blur();
        $("#content").focus();
    });

    $('#file-input').change(function(event) {
        app.select_file();
    });

    $('#file').click(function(event) {
        event.preventDefault();
        $('#file-input').click();
        event.target.blur();
    });

    $('#shorturl').click(function(event) {
        event.preventDefault();

        var spinner = $(this).find('.fa-spinner'),
            fd = app.url_data();

        spinner.removeClass('hidden');
        api.url.post(fd).done(function(data) {
            app.api_status(data);
            spinner.addClass('hidden');
        });

        event.target.blur();
    });

    $('#paste').click(function(event) {

        event.preventDefault();

        var spinner = $(this).find('.fa-spinner');
        var label = $("#label").val();

        paste_submit(spinner, api.paste.post, label);

        event.target.blur();
    });

    $('#update').click(function(event) {

        event.preventDefault();

        var spinner = $(this).find('.fa-spinner'),
            uuid = $("#uuid").val();

        paste_submit(spinner, api.paste.put, uuid, true);

        event.target.blur();
    });

    $('#delete').click(function(event) {
        event.preventDefault();

        var spinner = $(this).find('.fa-spinner'),
            uuid = $('#uuid');

        spinner.removeClass('hidden');
        api.paste.delete(uuid.val()).done(function(data) {
            app.api_status(data);
            uuid.val('');
            spinner.addClass('hidden');
        });

        event.target.blur();
    });

    $('#load').click(function(event) {
        event.preventDefault();

        var spinner = $(this).find('.fa-spinner'),
            id = $('#pasteid').val();

        spinner.removeClass('hidden');
        api.paste.get(id).done(function(data, status, xhr) {
            app.set_content(data, xhr, id);
            spinner.addClass('hidden');
        });

        event.target.blur();
    });

    $('#paste-form').submit(function(event) {
        event.preventDefault();
    });

    // refresh on firefox doesn't clear form values, but does clear
    // element state; whut
    app.clear();
});
