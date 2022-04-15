const Koa = require('koa')
const fs = require('fs')
const path = require('path')
const compilerSfc = require('@vue/compiler-sfc')
const compilerDom = require('@vue/compiler-dom')
const app = new Koa()

//提供静态服务
app.use(async ctx => {
    const { url, query } = ctx.request
    console.log('url: ' + url);
    //  / => index.html
    if(url === '/') {
        ctx.type = 'text/html'
        let content = fs.readFileSync('./index.html', 'utf-8')
        
        //入口文件加入环境变量
        content = content.replace('<script',
            `
                <script>
                    window.process = {env: {NODE_ENV: 'dev' }}
                </script>
                <script
            `
        )

        ctx.body = content
    }


    // * => src/*.js
    else if(url.endsWith('.js')) {
        // /src/main.js =》 代码文件所在位置/src/main.js
        const p = path.resolve(__dirname,url.slice(1))
        const content = fs.readFileSync(p, 'utf-8')
        ctx.type = 'application/javascript'
        ctx.body = rewriteImport(content)
    }


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
})


app.listen(3000, () => {
    console.log('Vite start at 3000');
})