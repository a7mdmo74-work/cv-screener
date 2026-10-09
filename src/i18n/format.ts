"use client";
import { useFormatter } from "next-intl";
export function useUiFormatter() {
  const format=useFormatter();
  return {number:(value:number, options:{minimumFractionDigits?:number;maximumFractionDigits?:number;style?:"decimal"|"percent"}={})=>format.number(value,{...options,numberingSystem:"latn"}),date:(value:Date)=>format.dateTime(value,{year:"numeric",month:"short",day:"numeric",calendar:"gregory",numberingSystem:"latn"}),relativeTime:format.relativeTime};
}
