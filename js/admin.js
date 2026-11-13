(function(){
"use strict";
const cfg=window.BVTCS_SUPABASE;
const client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
let challenge=null, factorId=null;
function note(message,error=false){$("notice").textContent=message;$("notice").classList.toggle("error",error)}
function show(id,on){$(id).hidden=!on}
function safe(v){return v==null?"":String(v)}
function addCell(row,value){const td=document.createElement("td");td.textContent=safe(value);row.appendChild(td)}
async function renderSession(){
 const {data:{session}}=await client.auth.getSession();
 if(!session){show("login",true);show("mfa",false);show("dashboard",false);return}
 if(session.user.email?.toLowerCase()!=="info@bvtcs.com.qa"){await client.auth.signOut();note("This account is not authorized for BVTCS administration.",true);return}
 const {data:level,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
 if(error){note("Unable to verify MFA status. Please sign in again.",true);return}
 if(level.currentLevel!=="aal2"){
   const {data:factors,error:factorError}=await client.auth.mfa.listFactors();
   if(factorError){note("Could not load MFA factors.",true);return}
   const verified=factors.totp?.find(f=>f.status==="verified");
   if(verified){
     factorId=verified.id;
     const {data:ch,error:chError}=await client.auth.mfa.challenge({factorId});
     if(chError){note(chError.message,true);return}
     challenge=ch.id;show("login",false);show("mfa",true);show("dashboard",false);
   }else{
     const {data:enrol,error:enrolError}=await client.auth.mfa.enroll({factorType:"totp",friendlyName:"BVTCS Admin Authenticator"});
     if(enrolError){note(enrolError.message,true);return}
     factorId=enrol.id;challenge=null;
     $("qr").src=enrol.totp.qr_code;$("secret-text").textContent="Manual setup key: "+enrol.totp.secret;
     $("mfa-help").textContent="Set up an authenticator app to protect this administrator account.";
     show("enrol-area",true);show("login",false);show("mfa",true);show("dashboard",false);
   }
   return;
 }
 show("login",false);show("mfa",false);show("dashboard",true);$("welcome").textContent="Signed in as "+session.user.email;
 await loadRows();
}
async function loadRows(){
 $("status").textContent="Loading enquiries…";$("rows").replaceChildren();
 const {data,error}=await client.from("bv_customer_enquiries").select("id,created_at,customer_name,customer_phone,customer_email,service_selected,inquiry,status").order("created_at",{ascending:false}).limit(500);
 if(error){$("status").textContent="Could not load enquiries. Check administrator access and database policies.";note(error.message,true);return}
 $("status").textContent=data.length+" most recent enquiries shown (maximum 500).";
 for(const item of data){const tr=document.createElement("tr");const when=item.created_at?new Date(item.created_at).toLocaleString("en-GB",{timeZone:"Asia/Qatar"}):"";
 [when,item.customer_name,item.customer_phone,item.customer_email,item.service_selected,item.inquiry,item.status].forEach(v=>addCell(tr,v));$("rows").appendChild(tr)}
}
$("login-form").addEventListener("submit",async e=>{e.preventDefault();note("Signing in…");const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){note("Sign-in failed. Check your credentials or contact the system administrator.",true);return}await renderSession()});
$("mfa-form").addEventListener("submit",async e=>{e.preventDefault();const code=$("otp").value.trim();let ch=challenge;if(!ch){const {data,error}=await client.auth.mfa.challenge({factorId});if(error){note(error.message,true);return}ch=error?null:data.id}
 const {error}=await client.auth.mfa.verify({factorId,challengeId:ch,code});if(error){note("MFA verification failed. Check the code and try again.",true);return}
 show("enrol-area",false);$("otp").value="";await renderSession();});
$("refresh").addEventListener("click",loadRows);
$("logout").addEventListener("click",async()=>{await client.auth.signOut();location.reload()});
$("export").addEventListener("click",async()=>{
 $("status").textContent="Preparing secure Excel export…";
 const {data:{session}}=await client.auth.getSession();if(!session){note("Please sign in again.",true);return}
 const {data,error}=await client.functions.invoke("export-bv-enquiries",{headers:{Authorization:"Bearer "+session.access_token},body:{}});
 if(error){note("Export failed. Confirm MFA and administrator permissions.",true);$("status").textContent="Export unavailable.";return}
 let blob;if(data instanceof Blob)blob=data;else if(data instanceof ArrayBuffer)blob=new Blob([data],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});else{note("The export response was not a workbook.",true);return}
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="BVTCS-Customer-Enquiries.xlsx";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);$("status").textContent="Excel workbook downloaded securely.";
});
client.auth.onAuthStateChange(()=>{setTimeout(()=>renderSession(),0)});
renderSession().catch(()=>note("Could not initialize the administrator session.",true));
})();