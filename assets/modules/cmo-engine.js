import {VARIABLES,BLOCKS,MAX_SCORE} from './config.js';
export const priorityForScore=s=>s<=16?3:s<=22?2:1;
export function stratify(records,{manualPriority=null,manualReason=''}={}){
 const confirmed=new Map(records.filter(r=>['confirmed','modified','manual'].includes(r.validation)).map(r=>[r.id,r]));
 const age=confirmed.get('age');
 if(age?.value==='<18') return {applicable:false,reason:'Paciente menor de 18 años: utilizar el modelo CMO pediátrico.'};
 const blocks=Object.fromEntries(Object.keys(BLOCKS).map(k=>[k,0])); let total=0;
 for(const v of VARIABLES){const r=confirmed.get(v.id); const option=v.options.find(o=>o.value===r?.value); if(option){total+=option.score;blocks[v.block]+=option.score;}}
 if(total>MAX_SCORE) throw new Error('Puntuación imposible');
 const pregnancy=confirmed.get('pregnancy')?.value==='risk'; const calculated=pregnancy?1:priorityForScore(total);
 const override=manualPriority&&manualPriority<calculated;
 if(override&&!manualReason.trim()) throw new Error('El motivo de elevación profesional es obligatorio.');
 return {applicable:true,total,blocks,calculated,priority:override?manualPriority:calculated,pregnancy,override:Boolean(override),manualReason,confirmedCount:confirmed.size};
}
