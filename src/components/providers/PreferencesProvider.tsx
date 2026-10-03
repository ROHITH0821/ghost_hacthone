"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { MotionConfig, useReducedMotion } from 'framer-motion';
const KEY='ghost-ui-preferences';
type Preferences={compactLists:boolean;reduceMotion:boolean};
const defaults:Preferences={compactLists:false,reduceMotion:false};
const Context=createContext({ ...defaults, setPreference:(_key:keyof Preferences,_value:boolean)=>{} });
export function PreferencesProvider({children}:{children:ReactNode}) {
  const [preferences,setPreferences]=useState(defaults);
  const systemReduced=useReducedMotion();
  useEffect(()=>{try {const p=JSON.parse(localStorage.getItem(KEY)??'{}');setPreferences({compactLists:p.compactLists===true,reduceMotion:p.reduceMotion===true});}catch{/* Browser storage can be unavailable. */}},[]);
  useEffect(()=>{document.documentElement.dataset.compact=String(preferences.compactLists);document.documentElement.dataset.reduceMotion=String(preferences.reduceMotion||systemReduced);},[preferences,systemReduced]);
  function setPreference(key:keyof Preferences,value:boolean) {
    setPreferences(previous=>{const next={...previous,[key]:value};try{localStorage.setItem(KEY,JSON.stringify(next));}catch{/* Still applies for this session. */}return next;});
  }
  return <Context.Provider value={{...preferences,setPreference}}><MotionConfig reducedMotion={preferences.reduceMotion?'always':'user'}>{children}</MotionConfig></Context.Provider>;
}
export const usePreferences=()=>useContext(Context);
