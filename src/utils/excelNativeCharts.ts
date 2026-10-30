import JSZip from 'jszip';

export interface NativeBarSeriesSpec {
  name: string;
  nameFormula: string;
  valuesFormula: string;
  values: number[];
  color: string; // Hex RGB without '#', e.g. '10B981'
}

export interface NativeBarChartSpec {
  title: string;
  barDir: 'col' | 'bar';
  categoriesFormula: string;
  categories: string[];
  seriesList: NativeBarSeriesSpec[];
}

export interface NativeDoughnutChartSpec {
  title: string;
  nameFormula: string;
  seriesName: string;
  categoriesFormula: string;
  categories: string[];
  valuesFormula: string;
  values: number[];
  sliceColors: string[]; // Hex RGB without '#', e.g. ['10B981', 'EF4444']
}

export interface NativeChartPlacement {
  xml: string;
  name: string;
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
  fromColOff?: number;
  fromRowOff?: number;
  toColOff?: number;
  toRowOff?: number;
}

const escapeXml = (str: unknown): string => {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Construye el XML OpenXML (<c:chartSpace>) para un gráfico de barras o columnas nativo de Excel
 * vinculado dinámicamente a las celdas de la hoja de cálculo.
 */
export const buildNativeBarChartXml = (spec: NativeBarChartSpec): string => {
  const { title, barDir, categoriesFormula, categories, seriesList } = spec;
  const catAxPos = barDir === 'bar' ? 'l' : 'b';
  const valAxPos = barDir === 'bar' ? 'b' : 'l';
  const catOrientation = barDir === 'bar' ? 'maxMin' : 'minMax';
  const valCrosses = barDir === 'bar' ? 'max' : 'autoZero';

  const catPts = categories
    .map((c, i) => `<c:pt idx="${i}"><c:v>${escapeXml(c)}</c:v></c:pt>`)
    .join('');

  const serXml = seriesList
    .map((s, idx) => {
      const valPts = s.values
        .map((v, i) => `<c:pt idx="${i}"><c:v>${Number(v) || 0}</c:v></c:pt>`)
        .join('');
      return (
        `<c:ser>` +
        `<c:idx val="${idx}"/>` +
        `<c:order val="${idx}"/>` +
        `<c:tx><c:strRef><c:f>${escapeXml(s.nameFormula)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(s.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>` +
        `<c:spPr><a:solidFill><a:srgbClr val="${escapeXml(s.color)}"/></a:solidFill></c:spPr>` +
        `<c:invertIfNegative val="0"/>` +
        `<c:cat><c:strRef><c:f>${escapeXml(categoriesFormula)}</c:f><c:strCache><c:ptCount val="${categories.length}"/>${catPts}</c:strCache></c:strRef></c:cat>` +
        `<c:val><c:numRef><c:f>${escapeXml(s.valuesFormula)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${s.values.length}"/>${valPts}</c:numCache></c:numRef></c:val>` +
        `</c:ser>`
      );
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<c:date1904 val="0"/>` +
    `<c:lang val="es-PE"/>` +
    `<c:roundedCorners val="0"/>` +
    `<c:style val="2"/>` +
    `<c:chart>` +
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1050" b="1"><a:solidFill><a:srgbClr val="1E3A8A"/></a:solidFill></a:defRPr></a:pPr><a:r><a:rPr lang="es-PE" sz="1050" b="1"><a:solidFill><a:srgbClr val="1E3A8A"/></a:solidFill></a:rPr><a:t>${escapeXml(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>` +
    `<c:autoTitleDeleted val="0"/>` +
    `<c:plotArea>` +
    `<c:layout/>` +
    `<c:barChart>` +
    `<c:barDir val="${barDir}"/>` +
    `<c:grouping val="clustered"/>` +
    `<c:varyColors val="0"/>` +
    serXml +
    `<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>` +
    `<c:gapWidth val="150"/>` +
    `<c:overlap val="-10"/>` +
    `<c:axId val="110001"/>` +
    `<c:axId val="110002"/>` +
    `</c:barChart>` +
    `<c:catAx>` +
    `<c:axId val="110001"/>` +
    `<c:scaling><c:orientation val="${catOrientation}"/></c:scaling>` +
    `<c:delete val="0"/>` +
    `<c:axPos val="${catAxPos}"/>` +
    `<c:numFmt formatCode="General" sourceLinked="1"/>` +
    `<c:majorTickMark val="out"/>` +
    `<c:minorTickMark val="none"/>` +
    `<c:tickLblPos val="nextTo"/>` +
    `<c:crossAx val="110002"/>` +
    `<c:crosses val="autoZero"/>` +
    `<c:auto val="1"/>` +
    `<c:lblAlgn val="ctr"/>` +
    `<c:lblOffset val="100"/>` +
    `<c:noMultiLvlLbl val="0"/>` +
    `</c:catAx>` +
    `<c:valAx>` +
    `<c:axId val="110002"/>` +
    `<c:scaling><c:orientation val="minMax"/></c:scaling>` +
    `<c:delete val="0"/>` +
    `<c:axPos val="${valAxPos}"/>` +
    `<c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>` +
    `<c:numFmt formatCode="General" sourceLinked="1"/>` +
    `<c:majorTickMark val="out"/>` +
    `<c:minorTickMark val="none"/>` +
    `<c:tickLblPos val="nextTo"/>` +
    `<c:crossAx val="110001"/>` +
    `<c:crosses val="${valCrosses}"/>` +
    `<c:crossBetween val="between"/>` +
    `</c:valAx>` +
    `</c:plotArea>` +
    `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>` +
    `<c:plotVisOnly val="1"/>` +
    `<c:dispBlanksAs val="gap"/>` +
    `<c:showDLblsOverMax val="0"/>` +
    `</c:chart>` +
    `<c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>` +
    `</c:chartSpace>`
  );
};

/**
 * Construye el XML OpenXML (<c:chartSpace>) para un gráfico de anillo (Doughnut) nativo de Excel
 * vinculado dinámicamente a las celdas de cobertura de diagnósticos.
 */
export const buildNativeDoughnutChartXml = (spec: NativeDoughnutChartSpec): string => {
  const { title, nameFormula, seriesName, categoriesFormula, categories, valuesFormula, values, sliceColors } = spec;

  const catPts = categories
    .map((c, i) => `<c:pt idx="${i}"><c:v>${escapeXml(c)}</c:v></c:pt>`)
    .join('');

  const valPts = values
    .map((v, i) => `<c:pt idx="${i}"><c:v>${Number(v) || 0}</c:v></c:pt>`)
    .join('');

  const dPts = sliceColors
    .map(
      (clr, i) =>
        `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${escapeXml(clr)}"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`
    )
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<c:date1904 val="0"/>` +
    `<c:lang val="es-PE"/>` +
    `<c:roundedCorners val="0"/>` +
    `<c:style val="2"/>` +
    `<c:chart>` +
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1050" b="1"><a:solidFill><a:srgbClr val="1E3A8A"/></a:solidFill></a:defRPr></a:pPr><a:r><a:rPr lang="es-PE" sz="1050" b="1"><a:solidFill><a:srgbClr val="1E3A8A"/></a:solidFill></a:rPr><a:t>${escapeXml(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>` +
    `<c:autoTitleDeleted val="0"/>` +
    `<c:plotArea>` +
    `<c:layout/>` +
    `<c:doughnutChart>` +
    `<c:varyColors val="1"/>` +
    `<c:ser>` +
    `<c:idx val="0"/>` +
    `<c:order val="0"/>` +
    `<c:tx><c:strRef><c:f>${escapeXml(nameFormula)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(seriesName)}</c:v></c:pt></c:strCache></c:strRef></c:tx>` +
    dPts +
    `<c:cat><c:strRef><c:f>${escapeXml(categoriesFormula)}</c:f><c:strCache><c:ptCount val="${categories.length}"/>${catPts}</c:strCache></c:strRef></c:cat>` +
    `<c:val><c:numRef><c:f>${escapeXml(valuesFormula)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${valPts}</c:numCache></c:numRef></c:val>` +
    `</c:ser>` +
    `<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/><c:showLeaderLines val="1"/></c:dLbls>` +
    `<c:firstSliceAng val="0"/>` +
    `<c:holeSize val="55"/>` +
    `</c:doughnutChart>` +
    `</c:plotArea>` +
    `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>` +
    `<c:plotVisOnly val="1"/>` +
    `<c:dispBlanksAs val="gap"/>` +
    `<c:showDLblsOverMax val="0"/>` +
    `</c:chart>` +
    `<c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>` +
    `</c:chartSpace>`
  );
};

/**
 * Inyecta los gráficos nativos OpenXML en la primera hoja (sheet1.xml) de un archivo .xlsx generado por ExcelJS.
 */
export const injectNativeChartsIntoXlsxBuffer = async (
  xlsxBuffer: ArrayBuffer,
  charts: NativeChartPlacement[]
): Promise<ArrayBuffer> => {
  const zip = await JSZip.loadAsync(xlsxBuffer);

  // 1. Escribir cada archivo xl/charts/chartN.xml
  charts.forEach((chart, idx) => {
    const chartNum = idx + 1;
    zip.file(`xl/charts/chart${chartNum}.xml`, chart.xml);
  });

  // 2. Construir xl/drawings/drawing1.xml con los anclajes twoCellAnchor para cada gráfico
  const anchorsXml = charts
    .map((chart, idx) => {
      const chartNum = idx + 1;
      const cNvPrId = idx + 2;
      const fromColOff = chart.fromColOff ?? 0;
      const fromRowOff = chart.fromRowOff ?? 0;
      const toColOff = chart.toColOff ?? 0;
      const toRowOff = chart.toRowOff ?? 0;

      return (
        `<xdr:twoCellAnchor>` +
        `<xdr:from><xdr:col>${chart.fromCol}</xdr:col><xdr:colOff>${fromColOff}</xdr:colOff><xdr:row>${chart.fromRow}</xdr:row><xdr:rowOff>${fromRowOff}</xdr:rowOff></xdr:from>` +
        `<xdr:to><xdr:col>${chart.toCol}</xdr:col><xdr:colOff>${toColOff}</xdr:colOff><xdr:row>${chart.toRow}</xdr:row><xdr:rowOff>${toRowOff}</xdr:rowOff></xdr:to>` +
        `<xdr:graphicFrame macro="">` +
        `<xdr:nvGraphicFramePr><xdr:cNvPr id="${cNvPrId}" name="${escapeXml(chart.name)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
        `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
        `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">` +
        `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${chartNum}"/>` +
        `</a:graphicData></a:graphic>` +
        `</xdr:graphicFrame>` +
        `<xdr:clientData/>` +
        `</xdr:twoCellAnchor>`
      );
    })
    .join('');

  const drawingXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    anchorsXml +
    `</xdr:wsDr>`;

  zip.file('xl/drawings/drawing1.xml', drawingXml);

  // 3. Construir xl/drawings/_rels/drawing1.xml.rels
  const drawingRelsItems = charts
    .map((_, idx) => {
      const chartNum = idx + 1;
      return `<Relationship Id="rId${chartNum}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartNum}.xml"/>`;
    })
    .join('');

  const drawingRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    drawingRelsItems +
    `</Relationships>`;

  zip.file('xl/drawings/_rels/drawing1.xml.rels', drawingRelsXml);

  // 4. Vincular drawing1.xml en xl/worksheets/_rels/sheet1.xml.rels y xl/worksheets/sheet1.xml
  const sheet1RelsPath = 'xl/worksheets/_rels/sheet1.xml.rels';
  let drawingRelId = 'rId1';

  const existingSheet1Rels = zip.file(sheet1RelsPath);
  if (existingSheet1Rels) {
    let relsContent = await existingSheet1Rels.async('string');
    const matches = relsContent.match(/Id="rId(\d+)"/g) || [];
    const maxId = matches.reduce((max, m) => {
      const n = parseInt(m.replace(/\D/g, ''), 10);
      return n > max ? n : max;
    }, 0);
    drawingRelId = `rId${maxId + 1}`;
    const newRel = `<Relationship Id="${drawingRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`;
    relsContent = relsContent.replace('</Relationships>', `${newRel}</Relationships>`);
    zip.file(sheet1RelsPath, relsContent);
  } else {
    const newRelsXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="${drawingRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>` +
      `</Relationships>`;
    zip.file(sheet1RelsPath, newRelsXml);
  }

  const sheet1File = zip.file('xl/worksheets/sheet1.xml');
  if (sheet1File) {
    let sheet1Xml = await sheet1File.async('string');
    if (!sheet1Xml.includes('<drawing ')) {
      sheet1Xml = sheet1Xml.replace('</worksheet>', `<drawing r:id="${drawingRelId}"/></worksheet>`);
      zip.file('xl/worksheets/sheet1.xml', sheet1Xml);
    }
  }

  // 5. Registrar los ContentTypes en [Content_Types].xml
  const contentTypesFile = zip.file('[Content_Types].xml');
  if (contentTypesFile) {
    let ctXml = await contentTypesFile.async('string');
    let overrides = '';
    if (!ctXml.includes('/xl/drawings/drawing1.xml')) {
      overrides += `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`;
    }
    charts.forEach((_, idx) => {
      const chartNum = idx + 1;
      if (!ctXml.includes(`/xl/charts/chart${chartNum}.xml`)) {
        overrides += `<Override PartName="/xl/charts/chart${chartNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;
      }
    });
    if (overrides) {
      ctXml = ctXml.replace('</Types>', `${overrides}</Types>`);
      zip.file('[Content_Types].xml', ctXml);
    }
  }

  return await zip.generateAsync({ type: 'arraybuffer' });
};

