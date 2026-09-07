#!/usr/bin/env python3
import json, os, sys
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

src = sys.argv[1] if len(sys.argv) > 1 else 'artifacts/self-development/report.json'
out = sys.argv[2] if len(sys.argv) > 2 else 'artifacts/self-development/SFI_SELF_DEVELOPMENT_REPORT.pdf'
with open(src, encoding='utf-8') as f: data = json.load(f)
os.makedirs(os.path.dirname(out), exist_ok=True)

PAGE_W, PAGE_H = A4
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='SFIHero', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=25, leading=28, spaceAfter=7, textColor=colors.HexColor('#111111')))
styles.add(ParagraphStyle(name='SFIKicker', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=10, tracking=1.5, textColor=colors.HexColor('#555555')))
styles.add(ParagraphStyle(name='SFIH2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, leading=15, spaceBefore=10, spaceAfter=5))
styles.add(ParagraphStyle(name='SFIBody', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.7, leading=12.5, textColor=colors.HexColor('#222222')))
styles.add(ParagraphStyle(name='SFIMono', parent=styles['BodyText'], fontName='Courier', fontSize=7.4, leading=10, textColor=colors.HexColor('#333333')))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#222222')); canvas.setLineWidth(0.5)
    canvas.line(18*mm, 15*mm, PAGE_W-18*mm, 15*mm)
    canvas.setFont('Helvetica', 6.5); canvas.setFillColor(colors.HexColor('#555555'))
    canvas.drawString(18*mm, 10*mm, 'SYSTEM FRICTION INSTITUTE · SELF-OBSERVATION / INSTITUTIONAL EVOLUTION')
    canvas.drawRightString(PAGE_W-18*mm, 10*mm, f'PAGE {doc.page}')
    canvas.restoreState()

story = [
    Paragraph('SYSTEM FRICTION INSTITUTE', styles['SFIKicker']),
    Spacer(1, 5*mm),
    Paragraph('Institutional Self-Development Report', styles['SFIHero']),
    Paragraph('OBSERVE · RECONSTRUCT · REPAIR · RETURN · LEARN · ADD', styles['SFIKicker']),
    Spacer(1, 8*mm),
]
meta = [
    ['CONTRACT', data.get('contract','')], ['GENERATED', data.get('generatedAt','')],
    ['HEALTH', data.get('health','')], ['EPISTEMIC STATE', data.get('epistemicState','')],
]
t = Table(meta, colWidths=[42*mm, 120*mm])
t.setStyle(TableStyle([('FONT',(0,0),(0,-1),'Helvetica-Bold',7),('FONT',(1,0),(1,-1),'Courier',7),('LINEBELOW',(0,0),(-1,-1),0.25,colors.HexColor('#BBBBBB')),('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),5)]))
story += [t, Spacer(1, 5*mm), Paragraph('AUTHORITY RULE', styles['SFIH2']), Paragraph(data.get('rootGateRule',''), styles['SFIBody'])]

story += [Paragraph('OBSERVATION / FINDINGS', styles['SFIH2'])]
findings = data.get('findings', [])
if not findings: story.append(Paragraph('No deterministic defect was observed in this run.', styles['SFIBody']))
for f in findings:
    story += [Paragraph(f"<b>{f.get('severity','').upper()} · {f.get('kind','')} · {f.get('id','')}</b>", styles['SFIBody']), Paragraph(f.get('evidence',''), styles['SFIBody']), Paragraph('Required trajectory: ' + f.get('requiredAction',''), styles['SFIMono']), Spacer(1,2*mm)]

story += [Paragraph('EVIDENCE / VERIFICATION', styles['SFIH2'])]
for v in data.get('verification', []): story.append(Paragraph(f"{v.get('command')}: {'PASS' if v.get('ok') else 'FAIL'}", styles['SFIMono']))

story += [Paragraph('HYPOTHESIS · RIVAL · COUNTERFACTUAL', styles['SFIH2']), Paragraph('HYPOTHESIS — Detected findings represent implementation, wiring, operability, authority or assurance gaps.', styles['SFIBody']), Paragraph('RIVAL — A detector can be incomplete or wrong; no mutation becomes canon until executable verification supports it.', styles['SFIBody']), Paragraph('COUNTERFACTUAL — If the capability were fully operational, its end-to-end assurance should pass without founder intervention.', styles['SFIBody'])]

story += [Paragraph('RETURN / LEARN', styles['SFIH2']), Paragraph('Repair attempts and failures remain evidence. Successful bounded repair is re-observed before it can become a mutation candidate. Generated output never inherits OBSERVATION status.', styles['SFIBody'])]

story += [Paragraph('ADD · ROOT GATE', styles['SFIH2'])]
mut = data.get('mutationCandidates', [])
if not mut: story.append(Paragraph('No institutional mutation is ready for ROOT.', styles['SFIBody']))
for f in mut: story.append(Paragraph(f"ROOT REVIEW AFTER VERIFIED REPAIR — {f.get('id')}: {f.get('requiredAction')}", styles['SFIBody']))

story += [Spacer(1,6*mm), Paragraph('ROOT actions: ACCEPT · DENY · REQUIRE MORE EVIDENCE. The gate applies to ADD/PROMOTE only.', styles['SFIKicker'])]

doc = SimpleDocTemplate(out, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=22*mm, title='SFI Institutional Self-Development Report', author='System Friction Institute')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(out)
