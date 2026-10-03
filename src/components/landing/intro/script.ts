export const INTRO_DONE_EVENT = "ghost:intro-done";
export const INTRO_SEEN_KEY = "ghost-intro-seen";

/**
 * Runs before first paint (inlined in the page). Decides whether the intro
 * plays: once per session, never with reduced motion (system or in-app), and
 * never on a deep link to a section.
 */
export const INTRO_GATE_SCRIPT = `try{var d=document.documentElement,m=window.matchMedia("(prefers-reduced-motion: reduce)").matches,p=JSON.parse(localStorage.getItem("ghost-ui-preferences")||"{}");if(!m&&!p.reduceMotion&&!sessionStorage.getItem("${INTRO_SEEN_KEY}")&&!location.hash){d.setAttribute("data-intro","play")}}catch(e){}`;
