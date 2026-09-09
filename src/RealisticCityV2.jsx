import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {loadHumanAvatar,updateHumanAvatar,disposeHumanAvatar} from './HumanAvatar.jsx';
import './avatar.css';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export default function RealisticCityV2({gender='Female',onOpen,onExit,name='Shreya'}){
  const mount=useRef(null);
  const touch=useRef({x:0,y:0});
  const sprintTouch=useRef(false);
  const [avatarReady,setAvatarReady]=useState(false);
  const [avatarError,setAvatarError]=useState(false);

  useEffect(()=>{
    const el=mount.current;
    if(!el)return;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x9dbed4);
    scene.fog=new THREE.Fog(0x9dbed4,75,285);
    const camera=new THREE.PerspectiveCamera(58,el.clientWidth/el.clientHeight,.1,500);
    camera.position.set(0,6.5,17);
    const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));renderer.setSize(el.clientWidth,el.clientHeight);
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xdceeff,0x3e4b40,2.1));
    const sun=new THREE.DirectionalLight(0xffdfbd,3.2);sun.position.set(-90,130,70);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-150;sun.shadow.camera.right=150;sun.shadow.camera.top=150;sun.shadow.camera.bottom=-150;sun.shadow.camera.far=360;scene.add(sun);

    const mats={ground:new THREE.MeshStandardMaterial({color:0x456848,roughness:1}),road:new THREE.MeshStandardMaterial({color:0x20252a,roughness:.94}),curb:new THREE.MeshStandardMaterial({color:0x9b9c97,roughness:.86}),water:new THREE.MeshPhysicalMaterial({color:0x397d8d,roughness:.08,metalness:.12,transparent:true,opacity:.9,clearcoat:1,clearcoatRoughness:.08}),glass:new THREE.MeshPhysicalMaterial({color:0x507b88,roughness:.12,metalness:.16,transmission:.15,transparent:true,opacity:.8}),concrete:new THREE.MeshStandardMaterial({color:0xb4b1aa,roughness:.9}),dark:new THREE.MeshStandardMaterial({color:0x282d30,roughness:.7,metalness:.25}),tree:new THREE.MeshStandardMaterial({color:0x315f3d,roughness:1}),trunk:new THREE.MeshStandardMaterial({color:0x5e4432,roughness:1})};
    const addBox=(w,h,d,mat,x,y,z,cast=false,receive=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=receive;scene.add(m);return m};
    const addCyl=(r,h,mat,x,y,z,seg=12)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),mat);m.position.set(x,y,z);m.castShadow=true;scene.add(m);return m};
    addBox(360,.7,360,mats.ground,0,-.35,0,false,true);
    const river=new THREE.Mesh(new THREE.PlaneGeometry(310,42,80,14),mats.water);river.rotation.x=-Math.PI/2;river.position.set(0,.03,-52);scene.add(river);
    const lake=new THREE.Mesh(new THREE.CircleGeometry(31,64),mats.water);lake.scale.set(1.5,1,.8);lake.rotation.x=-Math.PI/2;lake.position.set(103,.04,72);scene.add(lake);

    const roads=[[0,16,260,14],[0,-10,260,14],[0,36,260,11],[-58,0,12,190],[10,0,12,190],[72,0,12,190],[-112,0,10,190]];roads.forEach(([x,z,w,d])=>{addBox(w,.12,d,mats.road,x,.05,z,false,true);addBox(w+3,.08,d+3,mats.curb,x,.12,z,false,true)});
    const lane=new THREE.MeshBasicMaterial({color:0xd6c46b});for(let x=-120;x<120;x+=12){addBox(6,.02,.12,lane,x,.125,16);addBox(6,.02,.12,lane,x,.125,-10)}for(let z=-90;z<95;z+=12){addBox(.12,.02,6,lane,-58,.125,z);addBox(.12,.02,6,lane,72,.125,z)}

    const windowMats=[0x9fcbd8,0x68818a,0xe0bd74].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.22,metalness:.14,emissive:c===0xe0bd74?0x30230e:0x0b171c,emissiveIntensity:.2}));
    const colors=[0x5e6265,0x77726b,0x8b735e,0x4f5b61,0x967e68,0x6c6661,0x49565b,0xa28c76];
    function building(x,z,w,d,h,c,style){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.78}));body.position.y=h/2;body.castShadow=true;body.receiveShadow=true;g.add(body);const floors=Math.max(2,Math.floor(h/3)),cols=Math.max(2,Math.floor(w/2.7));const front=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,1.05,.055),windowMats[style%3],floors*cols);let i=0;for(let fy=0;fy<floors;fy++)for(let cx=0;cx<cols;cx++){const px=-w/2+1.35+cx*((w-2.7)/(cols-1||1));const py=2+fy*((h-4)/(floors-1||1));front.setMatrixAt(i++,new THREE.Matrix4().makeTranslation(px,py,-d/2-.04))}front.instanceMatrix.needsUpdate=true;g.add(front);if(style%2===0)for(let fy=1;fy<Math.min(floors,7);fy+=2){const slab=new THREE.Mesh(new THREE.BoxGeometry(w+.5,.12,d*.74),mats.concrete);slab.position.set(0,fy*3.05,d*.03);g.add(slab)}if(h>28){addBox(.55,2.3,.55,mats.dark,x-w*.2,h+1,z-d*.2,true);addBox(.55,1.6,.55,mats.dark,x+w*.2,h+.7,z+d*.15,true)}}
    [[-85,48,22,24,32,0,2],[-55,51,24,22,46,1,0],[-24,48,20,25,29,2,1],[5,49,25,22,55,3,0],[39,48,22,25,38,4,2],[74,47,25,22,49,5,1],[110,46,25,28,32,6,0],[-89,9,27,24,27,7,1],[-37,8,22,26,35,1,2],[42,8,25,24,44,0,0],[89,9,30,25,29,3,1],[113,6,20,22,53,4,2],[-92,-21,24,23,39,2,0],[-37,-22,25,24,27,5,1],[42,-20,28,25,50,6,2],[92,-21,24,22,35,7,0],[-88,-73,28,23,30,0,2],[-50,-75,24,25,49,4,1],[4,-70,25,24,36,6,0],[48,-72,26,23,56,2,2],[92,-72,25,24,33,5,1]].forEach(b=>building(b[0],b[1],b[2],b[3],b[4],colors[b[5]],b[6]));

    addBox(250,.22,4,mats.concrete,0,.2,-30,false,true);addBox(31,.7,50,mats.concrete,8,1,-52,true,true);addBox(30,.25,48,mats.road,8,1.4,-52,false,true);for(let x=-6;x<=22;x+=3){addBox(.18,1.5,.18,mats.dark,x,2.2,-76,true);addBox(.18,1.5,.18,mats.dark,x,2.2,-28,true)}addBox(30,.16,.16,mats.dark,8,3,-76);addBox(30,.16,.16,mats.dark,8,3,-28);
    addBox(62,.08,74,new THREE.MeshStandardMaterial({color:0x355a3c,roughness:1}),99,.04,67,false,true);addBox(8,.11,68,new THREE.MeshStandardMaterial({color:0xb8a98e,roughness:.95}),99,.12,67);addBox(62,.11,7,new THREE.MeshStandardMaterial({color:0xb8a98e,roughness:.95}),99,.13,67);for(let i=0;i<30;i++){const a=i/30*Math.PI*2,r=18+(i*7)%14,x=99+Math.cos(a)*r,z=67+Math.sin(a)*r*.78;addCyl(.28,2.8,mats.trunk,x,1.4,z,8);const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(2.3,1),mats.tree);crown.position.set(x,3.8,z);crown.castShadow=true;scene.add(crown)}

    const cars=[];function car(color,x,z,rot=0){const g=new THREE.Group();g.position.set(x,.45,z);g.rotation.y=rot;scene.add(g);const body=new THREE.Mesh(new THREE.BoxGeometry(2.1,.55,4.1),new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.35}));body.position.y=.5;body.castShadow=true;g.add(body);const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.65,.72,2.05),mats.glass);cabin.position.set(0,1.03,.15);g.add(cabin);const wm=new THREE.MeshStandardMaterial({color:0x111315,roughness:.86});for(const [wx,wz] of [[-1.03,-1.25],[1.03,-1.25],[-1.03,1.25],[1.03,1.25]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.22,14),wm);w.rotation.z=Math.PI/2;w.position.set(wx,.36,wz);g.add(w)}cars.push(g);return g}car(0x315c88,-90,16);car(0xa33d35,-30,16);car(0xd0a132,45,16,Math.PI);car(0x49534f,92,16);car(0x7c3f7c,-62,-10,Math.PI);car(0x2d6d58,8,-10);car(0x7c7567,68,-10,Math.PI);

    const playerPos=new THREE.Vector3(0,0,23),npcPos=new THREE.Vector3(2,0,19);let playerAvatar=null,npcAvatar=null,disposed=false;
    Promise.all([loadHumanAvatar(scene,gender,playerPos),loadHumanAvatar(scene,gender==='Male'?'Female':'Male',npcPos)]).then(([p,n])=>{if(disposed){disposeHumanAvatar(scene,p);disposeHumanAvatar(scene,n);return}playerAvatar=p;npcAvatar=n;setAvatarReady(true)}).catch(err=>{console.error('Human avatar load failed',err);setAvatarError(true)});

    const keys={};const kd=e=>{keys[e.key.toLowerCase()]=true};const ku=e=>{keys[e.key.toLowerCase()]=false};window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);const clock=new THREE.Clock();let raf;const target=new THREE.Vector3();
    const animate=()=>{raf=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.045);let ix=0,iz=0;if(keys.w||keys.arrowup)iz-=1;if(keys.s||keys.arrowdown)iz+=1;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;ix+=touch.current.x;iz+=touch.current.y;const inputLen=Math.hypot(ix,iz);if(inputLen>1){ix/=inputLen;iz/=inputLen}const sprint=!!(keys.shift||sprintTouch.current),speed=sprint?15:7.5,moving=inputLen>.05;playerPos.x=clamp(playerPos.x+ix*speed*dt,-125,125);playerPos.z=clamp(playerPos.z+iz*speed*dt,-105,105);updateHumanAvatar(playerAvatar,dt,moving,sprint,playerPos,moving?Math.atan2(ix,iz):undefined);const dx=playerPos.x-npcPos.x,dz=playerPos.z-npcPos.z,dist=Math.hypot(dx,dz),followSpeed=dist>7?7.2:3.8;if(dist>2.5){npcPos.x+=dx/dist*followSpeed*dt;npcPos.z+=dz/dist*followSpeed*dt}updateHumanAvatar(npcAvatar,dt,dist>2.5,dist>8,npcPos,Math.atan2(dx,dz));cars.forEach((g,i)=>{const s=(i%2?1:-1)*(5.5+(i%3)*1.5);g.position.x+=s*dt;if(g.position.x>124)g.position.x=-124;if(g.position.x<-124)g.position.x=124});const rp=river.geometry.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),z=rp.getY(i);rp.setZ(i,Math.sin(x*.1+clock.elapsedTime*1.2)*.09+Math.cos(z*.2+clock.elapsedTime)*.04)}rp.needsUpdate=true;target.set(playerPos.x,1.2,playerPos.z);camera.position.lerp(new THREE.Vector3(playerPos.x,6.5,playerPos.z+12),.09);camera.lookAt(target);renderer.render(scene,camera)};animate();
    const resize=()=>{camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight)};window.addEventListener('resize',resize);
    return()=>{disposed=true;cancelAnimationFrame(raf);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);window.removeEventListener('resize',resize);disposeHumanAvatar(scene,playerAvatar);disposeHumanAvatar(scene,npcAvatar);renderer.dispose();el.innerHTML=''};
  },[gender]);

  const setTouch=(x,y)=>{touch.current={x,y}};
  return <main className="game"><div ref={mount} className="canvas"/><div className="gameTop"><div className="brandMini">YOUR <b>LIFE</b></div><div className="worldMeta">Tue, 12 Mar &nbsp; 5:20 PM &nbsp; 24°C &nbsp; Clear</div><button onClick={onExit}>⋮</button></div><div className="cityLabel"><b>RIVERSIDE CITY</b><span>Downtown · Waterfront District</span></div><div className="avatarState">{avatarReady?'REAL HUMAN AVATARS · RIGGED':'LOADING HUMAN AVATAR…'}{avatarError?' · RETRYING':''}</div><div className="gameMenu"><button onClick={()=>onOpen('map')}>◉<span>Map</span></button><button onClick={()=>onOpen('phone')}>▣<span>Phone</span></button><button onClick={()=>onOpen('activities')}>☷<span>Tasks</span></button><button onClick={()=>onOpen('actions')}>◌<span>Companion</span></button><button onClick={()=>onOpen('inventory')}>▢<span>Inventory</span></button></div><div className="gamePrompt"><b>{name}</b><span>{avatarReady?'Walk with me?':'Preparing character…'}</span></div><div className="controlBtns"><button onClick={()=>onOpen('actions')}>◉</button><button onClick={()=>onOpen('voice')}>🎙</button></div><div className="touchPad" onPointerLeave={()=>setTouch(0,0)}><button onPointerDown={()=>setTouch(0,-1)} onPointerUp={()=>setTouch(0,0)}>▲</button><div><button onPointerDown={()=>setTouch(-1,0)} onPointerUp={()=>setTouch(0,0)}>◀</button><button onPointerDown={()=>setTouch(1,0)} onPointerUp={()=>setTouch(0,0)}>▶</button></div><button onPointerDown={()=>setTouch(0,1)} onPointerUp={()=>setTouch(0,0)}>▼</button></div><button className="runBtn" onPointerDown={()=>{sprintTouch.current=true}} onPointerUp={()=>{sprintTouch.current=false}} onPointerLeave={()=>{sprintTouch.current=false}}>RUN</button><div className="gameHint">WASD / ARROWS · SHIFT = RUN · TOUCH PAD</div></main>;
}
