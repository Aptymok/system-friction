const VCARD=`BEGIN:VCARD
VERSION:4.0
KIND:individual
FN:Juan Antonio Marín Liera
N:Marín Liera;Juan Antonio;;;
ORG:System Friction Institute
TITLE:Founder
EMAIL;TYPE=work:jmarin@systemfriction.org
TEL;TYPE=cell,voice:+5214496370444
URL;TYPE=work:https://systemfriction.org
URL;TYPE=profile:https://systemfriction.org/juan
IMPP;TYPE=personal:https://wa.me/5214496370444
X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/juanliera/
X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/company/system-friction-institute/
NOTE:System Friction Institute — Nothing acts alone. Reality answers back.
REV:20261007T000000Z
END:VCARD
`;

export function GET(){
  return new Response(VCARD,{
    headers:{
      'Content-Type':'text/vcard; charset=utf-8',
      'Content-Disposition':'attachment; filename="Juan_Antonio_Marin_Liera_SFI.vcf"',
      'Cache-Control':'public, max-age=3600',
    },
  });
}
