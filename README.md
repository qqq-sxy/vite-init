# 项目使用

本项目使用的技术栈有vue+koa+vite

入口文件 main.js
启动项目 node index.js
进入项目 http://localhost:3000/


# vite简介
vite是一个由原生ES Module驱动的Web开发工具，在开发环境基于浏览器原生ES imports开发，在生产环境基于Rollup打包


# vite实现原理
启动一个koa服务器拦截浏览器请求ES模块的请求。通过路径查找目录下对应文件做一定的处理最终以ES模块格式返回给客户端

# 实现基础功能
能对首页的模块化进行实现
## 创建main.js文件，moduleA.js文件

    //main.js
        import { str } from './moduleA.js'
        console.log('vite ...' + str);


    //moduleA.js
        export const str = '手写vite'


## 创建一个简单的静态服务

    const Koa = require('koa')
    const fs = require('fs')
    const path = require('path')

    const app = new Koa()


    app.use(async ctx => {
        const { url, query } = ctx.request
        console.log('url: ' + url);
        //  / => index.html
        if(url === '/') {
            ctx.type = 'text/html'
            let content = fs.readFileSync('./index.html', 'utf-8')
            ctx.body = content
        }
        // * => src/*.js
        else if(url.endsWith('.js')) {
            // /src/main.js =》 代码文件所在位置/src/main.js
            const p = path.resolve(__dirname,url.slice(1))
            const content = fs.readFileSync(p, 'utf-8')
            ctx.type = 'application/javascript'
            ctx.body = content
        }

    })


    app.listen(3000, () => {
        console.log('3000监听中');
    })


# 第三方库支持
比如支持vue的库
## 下载vue

## 将main.js文件改为
    import { createApp, h} from 'vue'

    const App = {
        render() {
            //<div><div>Hello Vite</div></div>
            return h('div', null, [h('div'), String('Hello Vite')])
        }
    }


## 在index.html文件添加
    <div id="app"></div>


## 静态服务器文件index.js添加
    //第三方库的支持   //vue => node_modules/***
     else if(url.startsWith('/@modules')) {
        //引入到  node_modules/vue/ 的es模块入口
        //读取package.json的module属性
        const prefix = path.resolve(__dirname, 'node_modules', url.replace('/@modules/', ""))

        const module = require(prefix + '/package.json').module
        //dist/vue.runtime.esm-bundler.js
        const p = path.resolve(prefix, module)
        const ret = fs.readFileSync(p, 'utf-8')
        ctx.type = 'application/javascript'
        //不一定保证vue中加载其他第三方的库
        ctx.body = rewriteImport(ret)

    }

## 因为vue库中的可能还在加载其他第三方的库所以写一个重写函数

    //改写函数
    //需要改写一下浏览器 浏览器能解析的是相对或者绝对路径 解析不了 'vue'
    //'vue' => '/@modules/vue  => 别名'
    //from 'xxx'
    function rewriteImport(content) {
        //正则
        return content.replace(/ from ['|"]([^'"]+)['|"]/g, function(s0,s1) {
            if(s1[0] !== '.' && s1[1] !== '/') {
                //是不是一个绝对路径（/）或者相对路径(../   ./)
                return `from '/@modules/${s1}'`
            } else {
                return s0
            }
        })
    }

## 对上述细节进行优化
### 在入口文件加入环境变量，加入
    //入口文件加入环境变量
        content = content.replace('<script',
            `
                <script>
                    window.process = {env: {NODE_ENV: 'dev' }}
                </script>
                <script
            `
        )

    //给js文件的解析也加上重写函数
    ctx.body = rewriteImport(content)



# Vue单页文件支持
## 在src下创建一个App.vue文件

    <template>
       <div>
            <h1>我是单文件组件</h1>
            <h2>
                <span>count is {{count}}</span>
                <button @click="count++">+1</button>
            </h2>
       </div>
    </template>

    <script>
        import { ref } from 'vue'
        export default {
            setup() {
                const count = ref(6)
                function add() {
                    count.value ++
                }

                return { count }
            }
        }
    </script>

##  对main.js文件进行修改
    import { createApp, h} from 'vue'
    import App from './App.vue'
    // const App = {
    //     render() {
    //         //<div><div>Hello Vite</div></div>
    //         return h('div', null, [h('div'), String('Hello Vite')])
    //     }
    // }

    createApp(App).mount('#app')


## 对静态服务器index.js修改

    const compilerSfc = require('@vue/compiler-sfc')
    const compilerDom = require('@vue/compiler-dom')


  //支持SFC组件， 单文件组件
    else if(url.indexOf('.vue') > -1) {
        //第一步  vue文件需要一个编译 vue文件 => 分成template script两个部分 {compiler-sfc}
        const p = path.resolve(__dirname, url.split('?')[0].slice(1))
        const { descriptor } = compilerSfc.parse(fs.readFileSync(p,'utf-8'))
        // console.log('descriptor:', descriptor );
        if(!query.type) {
            //提取JS部分 + render函数(template模板生成)
            ctx.type = "application/javascript"
            ctx.body = `${rewriteImport(
                    descriptor.script.content.replace("export default ", "const __script = ")
                )}
                import { render as __render } from "${url}?type=template"
                __script.render = __render
                export default __script
            `
        } else {
            // 第二步 *.vue => template模板  => render函数  {compiler-dom}
            const template = descriptor.template
            const render = compilerDom.compile(template.content, {mode: 'module'})
            ctx.type = 'application/javascript'
            // console.log('render:', render);
            ctx.body = rewriteImport(render.code)
        }       
    }


# CSS文件支持
## 新建一个入口文件 index.css
    h1 {color: red;}
## 在入口文件中引入index.css


## 在静态服务器index.js中加入代码
    //css文件
    else if(url.endsWith('.css')) {
        const p = path.resolve(__dirname, url.slice(1))
        const file = fs.readFileSync(p, 'utf-8')


        //css转换为 JS代码
        //利用js添加一个 style 标签
        const content = `
            const css = "${file.replace(/\n/g, "")}"
            let link = document.createElement('style')
            link.setAttribute('type', 'text/css')
            document.head.appendChild(link)
            link.innerHTML = css
            export default css
        `
        ctx.type = 'application/javascript'
        ctx.body = content
    }
