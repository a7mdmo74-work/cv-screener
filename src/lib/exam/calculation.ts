// Deliberately restricted arithmetic parser. No eval, functions, identifiers or property access.
export function calculate(expression:string):number {
  if(expression.length>200 || !/^[\d.\s()+*/%\-]+$/.test(expression))throw new Error("Only arithmetic is allowed");
  const tokens=expression.match(/\d+(?:\.\d+)?|[()+*/%\-]/g)??[];let i=0;
  function atom():number {const t=tokens[i++];if(t==="-")return -atom();if(t==="+")return atom();if(t==="("){const v=sum();if(tokens[i++]!==")")throw new Error("Unbalanced expression");return v;}if(!t||!/^(\d+(\.\d+)?)$/.test(t))throw new Error("Invalid number");return Number(t);}
  function product():number {let v=atom();while(["*","/","%"].includes(tokens[i])){const op=tokens[i++],b=atom();v=op==="*"?v*b:op==="/"?v/b:v%b;}return v;}
  function sum():number {let v=product();while(["+","-"].includes(tokens[i])){const op=tokens[i++],b=product();v=op==="+"?v+b:v-b;}return v;}
  const result=sum();if(i!==tokens.length||!Number.isFinite(result))throw new Error("Invalid arithmetic");return result;
}
