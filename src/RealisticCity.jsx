import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export default function RealisticCity({gender='Female',onOpen,onExit,name='Shreya'}){
  const mount=useRef();
  const touch=useRef({x:0,y:0});

  useEffect(()=>{
    const el=mount.current;
    if(!el)return;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x9fc5df);
    scene.fog=new THREE.Fog(0x9fc5df,90,300);

    const camera=new THREE.PerspectiveCamera(58,el.clientWidth/el.clientHeight,.1,500);
    camera.position.set(0,7,16);
    const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
    renderer.setSize(el.clientWidth,el.clientHeight);
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.05;
    el.appendChild(renderer.domElement);

    const hemi=new THREE.HemisphereLight(0xd9ecff,0x53604f,2.0);
    scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xffe3bf,3.0);
    sun.position.set(-80,120,55);
    sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-150; sun.shadow.camera.right=150;
    sun.shadow.camera.top=150; sun.shadow.camera.bottom=-150;
    sun.shadow.camera.near=1; sun.shadow.camera.far=360;
    sun.shadow.bias=-0.0005;
    scene.add(sun);

    const mats={
      asphalt:new THREE.MeshStandardMaterial({color:0x24282d,roughness:.94,metalness:.02}),
      sidewalk:new THREE.MeshStandardMaterial({color:0x8d918e,roughness:.86}),
      concrete:new THREE.MeshStandardMaterial({color:0xb4b1aa,roughness:.9}),
      grass:new THREE.MeshStandardMaterial({color:0x456b4b,roughness:1}),
      darkGrass:new THREE.MeshStandardMaterial({color:0x304e39,roughness:1}),
      water:new THREE.MeshPhysicalMaterial({color:0x3c8292,roughness:.1,metalness:.12,transparent:true,opacity:.88,clearcoat:1,clearcoatRoughness:.08}),
      glass:new THREE.MeshPhysicalMaterial({color:0x4f7180,roughness:.12,metalness:.15,transmission:.15,transparent:true,opacity:.78}),
      white:new THREE.MeshStandardMaterial({color:0xe8e4dc,roughness:.7}),
      brick:new THREE.MeshStandardMaterial({color:0x735a50,roughness:.9}),
      stone:new THREE.MeshStandardMaterial({color:0x77746e,roughness:.92}),
      beige:new THREE.MeshStandardMaterial({color:0xb59d82,roughness:.88}),
      dark:new THREE.MeshStandardMaterial({color:0x353a3c,roughness:.7}),
      green:new THREE.MeshStandardMaterial({color:0x2e5d42,roughness:1}),
      tree:new THREE.MeshStandardMaterial({color:0x376747,roughness:1}),
      trunk:new THREE.MeshStandardMaterial({color:0x614633,roughness:1}),
      red:new THREE.MeshStandardMaterial({color:0x9e4039,roughness:.62,metalness:.12}),
      yellow:new THREE.MeshStandardMaterial({color:0xd7a23c,roughness:.58,metalness:.12})
    };

    const addBox=(w,h,d,material,x,y,z,cast=true,receive=true)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=receive;scene.add(m);return m;
    };
    const addCylinder=(r,h,material,x,y,z,segments=12)=>{
      const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(x,y,z);m.castShadow=true;scene.add(m);return m;
    };

    // Ground and waterfront
    addBox(360,.7,360,mats.grass,0,-.35,0,false,true);
    const river=new THREE.Mesh(new THREE.PlaneGeometry(310,38,70,12),mats.water);
    river.rotation.x=-Math.PI/2; river.position.set(0,.02,-48); river.receiveShadow=true; scene.add(river);
    const lake=new THREE.Mesh(new THREE.CircleGeometry(30,64),mats.water);
    lake.scale.set(1.45,1,.72); lake.rotation.x=-Math.PI/2; lake.position.set(92,.025,65); lake.receiveShadow=true; scene.add(lake);

    // Roads, sidewalks and lane markings
    const roadDefs=[
      [0,18,250,13],[0,-8,250,13],[0,35,250,10],[0,-28,250,10],
      [-58,0,12,190],[10,0,12,190],[70,0,12,190],[-112,0,10,190]
    ];
    roadDefs.forEach(([x,z,w,d])=>{
      addBox(w,.12,d,mats.asphalt,x,.05,z,false,true);
      const horizontal=w>d;
      const sw=horizontal?w+3:11, sd=horizontal?11:d+3;
      addBox(sw,.09,sd,mats.sidewalk,x,.12,z,false,true);
    });
    const dashMat=new THREE.MeshBasicMaterial({color:0xd9c86e});
    for(let x=-115;x<115;x+=12){addBox(6,.018,.12,dashMat,x,.125,18,false,false);addBox(6,.018,.12,dashMat,x,.125,-8,false,false)}
    for(let z=-105;z<105;z+=12){addBox(.12,.018,6,dashMat,-58,.125,z,false,false);addBox(.12,.018,6,dashMat,70,.125,z,false,false)}

    // Buildings with facade depth, windows, balconies and rooftop equipment
    const windowMats=[
      new THREE.MeshStandardMaterial({color:0x9ec7d5,roughness:.2,metalness:.15,emissive:0x172c34,emissiveIntensity:.18}),
      new THREE.MeshStandardMaterial({color:0x6e8790,roughness:.25,metalness:.18}),
      new THREE.MeshStandardMaterial({color:0xd8b56b,roughness:.25,emissive:0x392b12,emissiveIntensity:.25})
    ];
    const buildingColors=[0x5e6265,0x77726b,0x8b735e,0x4f5b61,0x967e68,0x6c6661,0x49565b,0xa28c76];
    function building(x,z,w,d,h,color,style=0){
      const baseMat=new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.03});
      const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
      const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),baseMat);body.position.y=h/2;body.castShadow=true;body.receiveShadow=true;g.add(body);
      const floors=Math.max(2,Math.floor(h/3));
      const cols=Math.max(2,Math.floor(w/2.6));
      const front=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,1.05,.055),windowMats[style%windowMats.length],floors*cols);
      let idx=0;
      for(let fy=0;fy<floors;fy++)for(let cx=0;cx<cols;cx++){
        const px=-w/2+1.35+cx*((w-2.7)/(cols-1||1));
        const py=2+fy*((h-4)/(floors-1||1));
        const matrix=new THREE.Matrix4().makeTranslation(px,py,-d/2-.035);front.setMatrixAt(idx++,matrix);
      }
      front.instanceMatrix.needsUpdate=true;g.add(front);
      if(style%3!==1){
        const side=new THREE.InstancedMesh(new THREE.BoxGeometry(.055,1.05,.9),windowMats[(style+1)%windowMats.length],floors*Math.max(2,Math.floor(d/2.8)));
        idx=0;const sideCols=Math.max(2,Math.floor(d/2.8));
        for(let fy=0;fy<floors;fy++)for(let cz=0;cz<sideCols;cz++){
          const pz=-d/2+1.25+cz*((d-2.5)/(sideCols-1||1));const py=2+fy*((h-4)/(floors-1||1));
          side.setMatrixAt(idx++,new THREE.Matrix4().makeTranslation(w/2+.035,py,pz));
        }
        side.instanceMatrix.needsUpdate=true;g.add(side);
      }
      if(style%2===0){
        for(let floor=1;floor<Math.min(floors,7);floor+=2){
          const slab=new THREE.Mesh(new THREE.BoxGeometry(w+.5,.12,d*.75),mats.concrete);slab.position.set(0,floor*3.05,d*.02);slab.castShadow=true;g.add(slab);
        }
      }
      if(h>22){
        addBox(.55,2.3,.55,mats.dark,x-w*.23,h+1,z-d*.2);
        addBox(.55,1.7,.55,mats.dark,x+w*.2,h+.8,z+d*.18);
      }
      return g;
    }
    const blocks=[
      [-82,45,20,24,31,0,2],[-55,52,24,22,44,1,0],[-25,48,19,25,28,2,1],[5,50,24,22,53,3,0],[39,49,22,25,36,4,2],[73,48,25,22,47,5,1],[110,45,25,28,31,6,0],
      [-88,10,27,24,25,7,1],[-38,8,22,26,34,1,2],[42,8,25,24,42,0,0],[88,10,30,25,27,3,1],[112,6,20,22,51,4,2],
      [-92,-20,24,23,38,2,0],[-37,-22,25,24,26,5,1],[42,-20,28,25,48,6,2],[91,-21,24,22,34,7,0],
      [-91,-72,28,23,29,0,2],[-50,-75,24,25,48,4,1],[4,-70,25,24,35,6,0],[48,-72,26,23,54,2,2],[92,-72,25,24,32,5,1]
    ];
    blocks.forEach(([x,z,w,d,h,c,s])=>building(x,z,w,d,h,buildingColors[c],s));

    // Residential low-rise waterfront district
    for(let i=0;i<12;i++){
      const x=-100+i*18; const z=-38-(i%2)*5;
      building(x,z,13,11,9, i%2?0x8d7866:0xa18b76,i%3);
    }

    // Park on the east side
    addBox(62,.08,74,mats.darkGrass,98,.04,65,false,true);
    const pathMat=new THREE.MeshStandardMaterial({color:0xb9a98e,roughness:.95});
    addBox(8,.11,68,pathMat,98,.12,65,false,true);
    addBox(62,.11,7,pathMat,98,.13,65,false,true);
    for(let i=0;i<26;i++){
      const a=(i/26)*Math.PI*2;const r=18+((i*7)%13);const x=98+Math.cos(a)*r;const z=65+Math.sin(a)*r*.78;
      addCylinder(.28,2.8,mats.trunk,x,1.4,z,8);
      const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(2.25,1),mats.tree);crown.position.set(x,3.7,z);crown.scale.set(1,.9,1);crown.castShadow=true;scene.add(crown);
    }
    for(let i=0;i<7;i++){
      const x=76+i*7,z=47+(i%2)*9;
      addBox(2.4,.65,.7,mats.dark,x,.85,z);addBox(2.1,.55,.55,mats.dark,x,1.45,z);
    }

    // Bridge over the river
    addBox(30,.7,50,mats.concrete,8,1,-48);
    addBox(29,.25,48,mats.asphalt,8,1.38,-48,false,true);
    for(let x=-6;x<=22;x+=3){addBox(.18,1.5,.18,mats.dark,x,2.2,-72);addBox(.18,1.5,.18,mats.dark,x,2.2,-24)}
    addBox(30,.16,.16,mats.dark,8,3,-72);addBox(30,.16,.16,mats.dark,8,3,-24);

    // Waterfront promenade and café
    addBox(245,.25,4,mats.concrete,0,.2,-27,false,true);
    addBox(18,.25,12,mats.white,15,.35,-23);
    addBox(17,.18,11,mats.dark,15,.5,-23,false,true);
    addBox(17,5,1.2,mats.white,15,3,-28);
    for(let i=0;i<7;i++){addBox(1.2,2.5,1.2,mats.dark,8+i*2.3,1.8,-22);addCylinder(.18,1.2,mats.yellow,8+i*2.3,4.2,-22,12)}

    // Streetlights
    const lampMat=new THREE.MeshStandardMaterial({color:0x202528,roughness:.55,metalness:.45});
    const bulbMat=new THREE.MeshStandardMaterial({color:0xffdf9b,emissive:0xffb44a,emissiveIntensity:2.2});
    const lampPositions=[];
    for(let x=-105;x<=105;x+=30)for(const z of [12,-14])lampPositions.push([x,z]);
    for(let i=0;i<lampPositions.length;i++){
      const [x,z]=lampPositions[i];addCylinder(.09,4.4,lampMat,x,2.2,z,8);addBox(.9,.1,.1,lampMat,x+.38,4.25,z);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.14,8,8),bulbMat);bulb.position.set(x+.8,4.1,z);scene.add(bulb);
      if(i%3===0){const p=new THREE.PointLight(0xffc06a,.35,15);p.position.set(x+.8,4,z);scene.add(p)}
    }

    // Cars with simple but detailed geometry
    function car(color,x,z,rotation=0){
      const g=new THREE.Group();g.position.set(x,.45,z);g.rotation.y=rotation;scene.add(g);
      const bodyMat=new THREE.MeshStandardMaterial({color,roughness:.42,metalness:.35});
      const body=new THREE.Mesh(new THREE.BoxGeometry(2.1,.55,4.1),bodyMat);body.position.y=.5;body.castShadow=true;g.add(body);
      const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.65,.72,2.05),mats.glass);cabin.position.set(0,1.03,.15);cabin.castShadow=true;g.add(cabin);
      const bumper=new THREE.Mesh(new THREE.BoxGeometry(2.15,.16,.25),mats.dark);bumper.position.set(0,.42,2.03);g.add(bumper);
      const wheelMat=new THREE.MeshStandardMaterial({color:0x151718,roughness:.85});
      for(const [wx,wz] of [[-1.03,-1.25],[1.03,-1.25],[-1.03,1.25],[1.03,1.25]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.22,14),wheelMat);w.rotation.z=Math.PI/2;w.position.set(wx,.36,wz);w.castShadow=true;g.add(w)}
      const headMat=new THREE.MeshStandardMaterial({color:0xf5f0cf,emissive:0xffe2a2,emissiveIntensity:1.3});for(const wx of [-.62,.62]){const h=new THREE.Mesh(new THREE.BoxGeometry(.38,.18,.08),headMat);h.position.set(wx,.65,2.08);g.add(h)}
      return g;
    }
    const cars=[
      car(0x315c88,-90,18,0),car(0xa33d35,-30,18,0),car(0xd0a132,45,18,Math.PI),car(0x49534f,92,18,0),
      car(0x7c3f7c,-62,-8,Math.PI),car(0x2d6d58,8,-8,0),car(0x7c7567,68,-8,Math.PI),
      car(0xb2b8b6,-58,-70,Math.PI/2),car(0x3f4f75,70,-70,-Math.PI/2)
    ];

    // Player and companion, with soft capsule bodies and shadows
    const character=(color)=>{const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,1.0,7,14),new THREE.MeshStandardMaterial({color,roughness:.62}));body.position.y=1.05;body.castShadow=true;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.37,20,16),new THREE.MeshStandardMaterial({color:0xc98e72,roughness:.72}));head.position.y=2;head.castShadow=true;g.add(head);return g};
    const player=character(0x4d78d0);player.position.set(0,0,22);scene.add(player);
    const npc=character(gender==='Male'?0x3b9f8e:0xd66e91);npc.position.set(2,0,19);scene.add(npc);

    // Moving traffic
    const traffic=[
      {g:cars[0],axis:'x',speed:9,min:-118,max:118},{g:cars[1],axis:'x',speed:7,min:-118,max:118},{g:cars[2],axis:'x',speed:-8,min:-118,max:118},{g:cars[3],axis:'x',speed:6,min:-118,max:118},
      {g:cars[4],axis:'x',speed:-7,min:-118,max:118},{g:cars[5],axis:'x',speed:8,min:-118,max:118},{g:cars[6],axis:'x',speed:-6,min:-118,max:118}
    ];

    const keys={};
    const kd=e=>{keys[e.key.toLowerCase()]=true};
    const ku=e=>{keys[e.key.toLowerCase()]=false};
    window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);

    const clock=new THREE.Clock();let raf;
    const tmpTarget=new THREE.Vector3();
    const animate=()=>{
      raf=requestAnimationFrame(animate);
      const dt=Math.min(clock.getDelta(),.045);
      let ix=0,iz=0;
      if(keys.w||keys.arrowup)iz-=1;if(keys.s||keys.arrowdown)iz+=1;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;
      ix+=touch.current.x;iz+=touch.current.y;
      const len=Math.hypot(ix,iz)||1;ix/=len;iz/=len;
      const speed=10;
      player.position.x=clamp(player.position.x+ix*speed*dt,-125,125);
      player.position.z=clamp(player.position.z+iz*speed*dt,-105,105);
      if(Math.abs(ix)+Math.abs(iz)>.05)player.rotation.y=Math.atan2(ix,iz);
      npc.position.lerp(new THREE.Vector3(player.position.x+1.8,0,player.position.z+1.8),.045);
      npc.rotation.y+=((Math.atan2(player.position.x-npc.position.x,player.position.z-npc.position.z))-npc.rotation.y)*.08;
      const wave=clock.elapsedTime;
      const pos=river.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getY(i);pos.setZ(i,Math.sin(x*.11+wave*1.2)*.09+Math.cos(z*.22+wave)*.04)}
      pos.needsUpdate=true;river.geometry.computeVertexNormals();
      traffic.forEach(t=>{t.g.position.x+=t.speed*dt;if(t.g.position.x>t.max)t.g.position.x=t.min;if(t.g.position.x<t.min)t.g.position.x=t.max});
      // smooth third-person camera
      tmpTarget.set(player.position.x,1.1,player.position.z);
      const desired=new THREE.Vector3(player.position.x,7.5,player.position.z+15);
      camera.position.lerp(desired,.075);camera.lookAt(tmpTarget);
      renderer.render(scene,camera);
    };
    animate();

    const resize=()=>{camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight)};
    window.addEventListener('resize',resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);window.removeEventListener('resize',resize);renderer.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose?.()});el.innerHTML=''};
  },[gender]);

  const setTouch=(x,y)=>{touch.current={x,y}};
  return <main className="game">
    <div ref={mount} className="canvas"/>
    <div className="gameTop"><div className="brandMini">YOUR <b>LIFE</b></div><div className="worldMeta">Tue, 12 Mar &nbsp; 5:20 PM &nbsp; 24°C &nbsp; Clear</div><button onClick={onExit}>⋮</button></div>
    <div className="cityLabel"><b>RIVERSIDE CITY</b><span>Downtown · Waterfront District</span></div>
    <div className="gameMenu"><button onClick={()=>onOpen('map')}>◉<span>Map</span></button><button onClick={()=>onOpen('phone')}>▣<span>Phone</span></button><button onClick={()=>onOpen('activities')}>☷<span>Tasks</span></button><button onClick={()=>onOpen('actions')}>◌<span>Companion</span></button><button onClick={()=>onOpen('inventory')}>▢<span>Inventory</span></button></div>
    <div className="gamePrompt"><b>{name}</b><span>Shall we go to the park?</span></div>
    <div className="controlBtns"><button onClick={()=>onOpen('actions')}>◉</button><button onClick={()=>onOpen('voice')}>🎙</button></div>
    <div className="touchPad" onPointerLeave={()=>setTouch(0,0)}>
      <button onPointerDown={()=>setTouch(0,-1)} onPointerUp={()=>setTouch(0,0)}>▲</button>
      <div><button onPointerDown={()=>setTouch(-1,0)} onPointerUp={()=>setTouch(0,0)}>◀</button><button onPointerDown={()=>setTouch(1,0)} onPointerUp={()=>setTouch(0,0)}>▶</button></div>
      <button onPointerDown={()=>setTouch(0,1)} onPointerUp={()=>setTouch(0,0)}>▼</button>
    </div>
    <div className="gameHint">WASD / ARROWS · DRAG PAD TO MOVE</div>
  </main>;
}
