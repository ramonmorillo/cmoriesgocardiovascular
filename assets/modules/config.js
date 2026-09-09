export const BLOCKS={demographic:{label:'Demográficas',max:7},clinical:{label:'Clínicas',max:21},pharmacotherapy:{label:'Farmacoterapéuticas',max:10},social:{label:'Sociosanitarias',max:4}};
const yn=(risk,max=2)=>[{value:'none',label:'No / situación controlada',score:0},{value:'risk',label:risk,score:max}];
export const VARIABLES=[
 {id:'age',block:'demographic',label:'Edad',options:[{value:'<18',label:'<18 años (modelo no aplicable)',score:0},{value:'18-64',label:'18–64 años',score:0},{value:'65-74',label:'65–74 años',score:1},{value:'75+',label:'≥75 años',score:2}]},
 {id:'pregnancy',block:'demographic',label:'Embarazo',special:'priority1',options:yn('Embarazo',2)},
 {id:'nutrition',block:'demographic',label:'Peso / estado nutricional',options:[{value:'normal',label:'Sin alteración relevante',score:0},{value:'overweight',label:'Sobrepeso',score:1},{value:'risk',label:'Obesidad o desnutrición',score:2}]},
 {id:'sexRisk',block:'demographic',label:'Sexo en situaciones cardiovasculares específicas',options:[{value:'none',label:'Sin situación específica',score:0},{value:'risk',label:'Situación específica de riesgo',score:1}]},
 {id:'basePathology',block:'clinical',label:'Patología cardiovascular de base',options:yn('Patología de mayor complejidad',3)},
 {id:'cvComorbidity',block:'clinical',label:'Comorbilidad cardiovascular / combinación de especial riesgo',options:yn('Presente',3)},
 {id:'nonCvComorbidity',block:'clinical',label:'Comorbilidad no cardiovascular',options:yn('Relevante',2)},
 {id:'lipids',block:'clinical',label:'Dislipemia / objetivo LDL',options:yn('Objetivo no alcanzado',2)},
 {id:'severity',block:'clinical',label:'Gravedad de la afectación',options:yn('Afectación grave',3)},
 {id:'lvef',block:'clinical',label:'Fracción de eyección',options:yn('FEVI reducida',2)},
 {id:'thromboembolism',block:'clinical',label:'Tromboembolismo',options:yn('Antecedente o evento activo',2)},
 {id:'hypertension',block:'clinical',label:'Hipertensión arterial',options:yn('No controlada',2)},
 {id:'acuteCare',block:'clinical',label:'Ingresos/urgencias relacionados (últimos 12 meses)',options:yn('Uno o más episodios',1)},
 {id:'firstYear',block:'clinical',label:'Primer año tras evento coronario',options:yn('Sí',1)},
 {id:'regimenChanges',block:'pharmacotherapy',label:'Cambios del régimen de medicación',options:yn('Cambios desde la última visita',2)},
 {id:'complexity',block:'pharmacotherapy',label:'Complejidad farmacoterapéutica / polimedicación',options:yn('Complejidad o polimedicación',2)},
 {id:'highRiskMeds',block:'pharmacotherapy',label:'Medicamentos de alto riesgo',options:yn('Uno o más',2)},
 {id:'therapyGoals',block:'pharmacotherapy',label:'Objetivos farmacoterapéuticos',options:yn('No alcanzados',2)},
 {id:'adherence',block:'pharmacotherapy',label:'Adherencia / persistencia',interview:true,options:yn('Inadecuada',2)},
 {id:'lifestyle',block:'social',label:'Actividad física y tabaquismo',interview:true,options:[{value:'healthy',label:'Actividad adecuada y no fuma',score:0},{value:'one',label:'Sedentarismo o tabaquismo/exfumador <5 años',score:2},{value:'both',label:'Sedentarismo y tabaquismo/exfumador <5 años',score:4}]}
];
export const MAX_SCORE=42;
export const APP_CONFIG=Object.freeze({extractionEndpointUrl:globalThis.window?.CMO_APP_CONFIG?.extractionEndpointUrl||'',version:'1.0.0'});
