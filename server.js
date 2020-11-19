var http = require('http')
var fs = require('fs')
var url = require('url')
const { argv } = require('process')
const { resolveSoa } = require('dns')
var port = process.argv[2]
console.log(argv[1]);
if (!port) {
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) { queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method

    /******** 从这里开始看，上面不要看 ************/

    console.log('有个傻子发请求过来啦！路径（带查询参数）为：' + pathWithQuery)

    if (path === '/') {
        let string = fs.readFileSync('./index.html', 'utf-8');
        response.statusCode = 200
        console.log(string);
        let cookies = request.headers.cookie.split(";");
        let hash = {};
        cookies.forEach(item => {
            hash[item[0]] = item[1];
        });
        let email = hash['email'];
        let users = JSON.parse(fs.readFileSync('./db/users', 'utf-8'));
        let foundUser = "";
        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            if (user['emial'] === email) {
                foundUser = user;
                break;
            }
        }
        console.log(foundUser);
        if (foundUser) {
            string = string.replace('__pwd__', foundUser['pwd']);
        } else {
            string = string.replace('__pwd__', '没有找到');
        }
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write(string);
        response.end()
    } else if (path === '/sign_up' && method === 'GET') {
        response.statusCode = 200;
        //异步的读取文件，使用utf-8格式打开
        let string = fs.readFileSync('./sign_up.html', 'utf-8');
        //设置响应体的头部
        response.setHeader('Content-Type', 'text/html;charset=utf-8');
        // 设置响应体
        response.write(string);
        response.end();
    } else if (path === '/sign_up' && method === 'POST') {
        readBody(request).then((body) => {
            let hash = {};
            let strings = body.split("&");
            strings.forEach(item => {
                let parts = item.split("=");
                let key = parts[0];
                let val = parts[1];
                hash[key] = decodeURIComponent(val);
            });

            // 解构赋值
            let { email, pwd, pwdconfirmation } = hash;
            console.log(email, pwd, pwdconfirmation);
            if (email.indexOf("@") === -1) {
                response.statusCode = 400;
                response.setHeader('Content-type', 'application/json;charset=utf-8');
                response.write(`{
                    "errors":{
                        "email":"invalid"
                    }
                }`);
            } else if (pwd !== pwdconfirmation) {
                response.statusCode = 400;
                response.write('password not matach')
            } else {
                var users = fs.readFileSync('./db/users', 'utf-8');
                try {
                    users = JSON.parse(users);
                } catch (exception) {
                    users = [];
                }
                let inUse = false;
                for (let i = 0; i < users.length; i++) {
                    let user = users[i];
                    if (user["email"] === email) {
                        inUse = true;
                        break;
                    }
                }
                if (inUse) {
                    response.statusCode = 400;
                    response.setHeader('Content-Type', 'text/html;charset=utf-8');
                    response.write("email in use");
                } else {
                    users.push({ email: email, pwd: pwd, pwd: pwdconfirmation });
                }

                users = JSON.stringify(users);
                fs.writeFileSync('./db/users', users);
                response.statusCode = 200;
            }
            response.end();
        });
    } else if (path === '/sign_in' && method === 'GET') {
        let string = fs.readFileSync('./sign_in.html', 'utf-8');
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html;charset=utf-8');
        response.write(string);
        response.end();
    }
    else if (path === "/sign_in" && method === 'POST') {
        //获取前端传入的数据
        readBody(request).then((body) => {
            let hash = {};
            let strings = body.split("&");
            strings.forEach(item => {
                let parts = item.split("=");
                let key = parts[0];
                let val = parts[1];
                //解码
                hash[key] = decodeURIComponent(val);
            });
            //解构赋值
            let { email, pwd } = hash;
            let users = fs.readFileSync('./db/users', 'utf-8');
            users = JSON.parse(users);
            let found = false;
            for (let i = 0; i < users.length; i++) {
                let user = users[i];
                if (user.email === email && user.pwd === pwd) {
                    found = true;
                    break;
                }
            }
            if (found) {
                //设置Cookes
                response.setHeader('Set-Cookie', `sign_email=${email}`);
                response.statusCode = 200;
            } else {
                response.statusCode = 401;
            }
            response.end();
        });

    }
    else {
        response.statusCode = 404
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write(`你输入的路径不存在对应的内容`)
        response.end()
    }
});

server.listen(port);
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port);

//使用promise then异步
function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = [];
        request.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', () => {
            body = Buffer.concat(body).toString();
            //数据成功获取
            resolve(body);
        });
    });
}

