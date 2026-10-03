const express=require('express');const multer=require('multer');const fs=require('fs');const path=require('path');const crypto=require('crypto');
const app=express();const PORT=process.env.PORT||3000;const ROOT=__dirname;const UP=path.join(ROOT,'uploads');const DATA=path.join(ROOT,'data','episodes.json');
fs.mkdirSync(UP,{recursive:true});fs.mkdirSync(path.dirname(DATA),{recursive:true});if(!fs.existsSync(DATA))fs.writeFileSync(DATA,'[]');
const PATTERN_HASH=process.env.DEV_PATTERN_HASH||'18f4e2b48e4fdf718f94d0a0ebe7afc1f5b2b0ab6f987b8e826282981e355786';const sessions=new Set();
app.use(express.json());app.use(express.urlencoded({extended:true}));
function read(){try{return JSON.parse(fs.readFileSync(DATA,'utf8'))}catch{return[]}}function write(x){fs.writeFileSync(DATA,JSON.stringify(x,null,2))}
function auth(req,res,next){const t=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('dev_session='))?.split('=')[1];if(!t||!sessions.has(t))return res.status(401).json({error:'unauthorized'});next()}
app.post('/api/dev/login',(req,res)=>{const p=String(req.body.pattern||'');const h=crypto.createHash('sha256').update(p).digest('hex');if(h!==PATTERN_HASH)return res.status(403).json({ok:false});const token=crypto.randomBytes(24).toString('hex');sessions.add(token);res.setHeader('Set-Cookie',`dev_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);res.json({ok:true})});
app.get('/api/state',(req,res)=>res.json(read()));
const storage=multer.diskStorage({destination:(_req,_file,cb)=>cb(null,UP),filename:(_req,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase()||'.mp4';cb(null,crypto.randomUUID()+ext)}});
const upload=multer({storage,limits:{fileSize:3*1024*1024*1024},fileFilter:(_req,file,cb)=>{if(String(file.mimetype).startsWith('video/'))cb(null,true);else cb(new Error('Только видео'))}});
app.post('/api/upload',auth,upload.single('video'),(req,res)=>{if(!req.file)return res.status(400).json({error:'file'});const item={id:crypto.randomUUID(),animeId:Number(req.body.animeId),season:Number(req.body.season)||1,episode:Number(req.body.episode)||1,url:'/uploads/'+req.file.filename,name:req.file.originalname,size:req.file.size,createdAt:new Date().toISOString()};const all=read().filter(x=>!(x.animeId===item.animeId&&x.season===item.season&&x.episode===item.episode));all.push(item);write(all);res.json(item)});
app.use('/uploads',express.static(UP,{maxAge:'1h',acceptRanges:true}));app.use(express.static(path.join(ROOT,'public')));app.use((_req,res)=>res.sendFile(path.join(ROOT,'public','index.html')));
app.use((err,_req,res,_next)=>res.status(400).json({error:err.message||'upload error'}));app.listen(PORT,'0.0.0.0',()=>console.log(`Anime Hub 2: http://127.0.0.1:${PORT}`));
