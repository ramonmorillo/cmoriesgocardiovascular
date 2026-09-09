export const INTERVENTIONS=[
 {id:'education',level:3,category:'Educación/formación',resource:'educacion',label:'Información personalizada sobre tratamiento y autocuidado'},
 {id:'review',level:3,category:'Seguimiento farmacoterapéutico',resource:'seguimiento',label:'Revisar efectividad, seguridad y objetivos farmacoterapéuticos'},
 {id:'adherence',level:2,category:'Motivación',resource:'adherencia',label:'Evaluar adherencia, barreras y acordar acciones'},
 {id:'interactions',level:2,category:'Seguimiento farmacoterapéutico',resource:'interacciones',label:'Revisar interacciones y medicamentos de alto riesgo'},
 {id:'conciliation',level:2,category:'Seguimiento farmacoterapéutico',resource:'conciliacion',label:'Realizar conciliación farmacoterapéutica'},
 {id:'cardiology',level:2,category:'Coordinación',resource:'cardiologia',label:'Coordinar el plan con cardiología y enfermería'},
 {id:'telepharmacy',level:1,category:'Oportunidad/telefarmacia',resource:'telefarmacia',label:'Programar contacto entre visitas mediante telefarmacia'},
 {id:'telemonitor',level:1,category:'Oportunidad/telefarmacia',resource:'telemonitorizacion',label:'Valorar telemonitorización de resultados clínicos'},
 {id:'intensive',level:1,category:'Seguimiento farmacoterapéutico',resource:'seguimiento',label:'Seguimiento farmacoterapéutico intensivo individualizado'},
 {id:'multidisciplinary',level:1,category:'Coordinación',resource:'cardiologia',label:'Plan multidisciplinar coordinado con niveles asistenciales'}];
export function interventionsFor(priority,resources=[]){return INTERVENTIONS.filter(i=>i.level>=priority).map(i=>({...i,available:resources.includes(i.resource)}));}
export const periodicity=p=>p===1?'Revaloración orientativa cada 3–6 meses y tras cambios relevantes.':p===2?'Valoración anual, salvo cambios clínicos o terapéuticos o criterio profesional.':'Reevaluación según necesidad, cambios de tratamiento o criterio profesional.';
