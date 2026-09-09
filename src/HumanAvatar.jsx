import * as THREE from 'three';
import { loadWalkAvatar, getAvatar } from '@three-ws/walk';

const AVATARS={Female:'michelle',Male:'boss-vernington'};

export async function loadHumanAvatar(scene,gender='Female',position=new THREE.Vector3()){
  const id=AVATARS[gender]||AVATARS.Female;
  const entry=getAvatar(id);
  if(!entry) throw new Error(`Avatar ${id} is not available in the animation library`);
  const {model,controller}=await loadWalkAvatar(entry);
  model.position.copy(position);
  model.rotation.y=Math.PI;
  model.traverse(o=>{
    if(o.isMesh){
      o.castShadow=true;
      o.receiveShadow=true;
      if(o.material){o.material.needsUpdate=true;}
    }
  });
  scene.add(model);
  controller.setState('idle');
  return {model,controller};
}

export function updateHumanAvatar(actor,dt,moving,sprinting,position,heading){
  if(!actor)return;
  const {model,controller}=actor;
  model.position.copy(position);
  if(Number.isFinite(heading)){
    const target=heading;
    let delta=target-model.rotation.y;
    delta=Math.atan2(Math.sin(delta),Math.cos(delta));
    model.rotation.y+=delta*Math.min(1,dt*12);
  }
  controller.setState(sprinting?'run':moving?'walk':'idle');
  controller.update(dt);
}

export function disposeHumanAvatar(scene,actor){
  if(!actor)return;
  scene.remove(actor.model);
  actor.model.traverse(o=>{
    if(o.geometry)o.geometry.dispose?.();
    if(o.material){
      const materials=Array.isArray(o.material)?o.material:[o.material];
      materials.forEach(m=>m.dispose?.());
    }
  });
}
