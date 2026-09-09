import {VARIABLES} from './config.js';
const rules={
 age:[/\b(\d{1,3})\s*años?\b/i,m=>{const n=+m[1];return [n<18?'<18':n<65?'18-64':n<75?'65-74':'75+',`Edad: ${n} años`]}],
 pregnancy:[/\bembarazad[ao]?\b/i,()=>['risk','Embarazo referido']],
 lvef:[/\b(?:fevi|fracción de eyección)\D{0,12}(\d{1,2})\s*%/i,m=>[+m[1]<40?'risk':'none',m[0]]],
 hypertension:[/\b(?:hta|hipertensi[oó]n)\b/i,m=>['risk',m[0]]],
 thromboembolism:[/\b(?:tromboembolismo|embolia pulmonar|trombosis venosa)\b/i,m=>['risk',m[0]]],
 firstYear:[/\b(?:infarto|síndrome coronario|evento coronario)\b/i,m=>['risk',m[0]]],
 adherence:[/\b(?:no adherente|mala adherencia|abandono)\b/i,m=>['risk',m[0]]],
 lifestyle:[/\b(?:fumador|tabaquismo|sedentari[oa])\b/i,m=>['one',m[0]]],
 highRiskMeds:[/\b(?:acenocumarol|warfarina|digoxina|insulina)\b/i,m=>['risk',m[0]]],
 complexity:[/\bpolimedicad[oa]\b/i,m=>['risk',m[0]]]
};
export function heuristicExtract(text){return VARIABLES.map(v=>{const rule=rules[v.id];const matches=rule?[...text.matchAll(new RegExp(rule[0].source,rule[0].flags.includes('g')?rule[0].flags:rule[0].flags+'g'))]:[];if(!matches.length)return{id:v.id,value:null,evidence:'',confidence:'baja',origin:'local',validation:'missing',finding:v.interview?'requiere entrevista':'no encontrada'};const [value,evidence]=rule[1](matches[0]);return{id:v.id,value,evidence,confidence:'media',origin:'local',validation:'suggested',finding:matches.length>1?'ambigua':'detectada'};});}
