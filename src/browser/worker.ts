import ExcelJS from 'exceljs';
import { readCsv, readXlsx, inspectZip, exportXlsx, auditTables } from '../io/tables.ts';
import { aggregate, FixedRecipe } from '../domain/aggregate.ts';
import { aggregateFlexible, FlexibleRecipe } from '../domain/flexible.ts';
import { compare } from '../domain/compare.ts';
self.onmessage = async ({ data }) => {
  try {
    if (data.action === 'sheets') {
      inspectZip(data.bytes);
      const book = new ExcelJS.Workbook(); await book.xlsx.load(data.bytes);
      self.postMessage({ value: book.worksheets.map(s => s.name) });
    } else if (data.action === 'read') {
      const value = data.name.toLowerCase().endsWith('.csv') ? readCsv(data.bytes, data.name) : await readXlsx(data.bytes, data.name, data.sheet);
      self.postMessage({ value });
    } else if(data.action==='export') {
      const {exportCsv,exportPdf}=await import('../io/outputs.ts');
      const {headers,rows}=data.result;
      if(data.format==='csv')self.postMessage({value:exportCsv(headers,rows)});
      else if(data.format==='pdf'){
        const response=await fetch('/fonts/NotoSansJP.ttf');if(!response.ok)throw new Error('PDF用フォントを読み込めません');
        self.postMessage({value:await exportPdf(headers,rows,new Uint8Array(await response.arrayBuffer()))});
      }else throw new Error('保存形式を確認してください');
    } else {
      const recipe=data.recipe.version===2 ? FlexibleRecipe.parse(data.recipe) : FixedRecipe.parse(data.recipe);
      const result = 'version' in recipe ? aggregateFlexible(data.tables,recipe) : aggregate(data.tables,recipe);
      const metrics='summaries' in result?result.summaries as {label:string;value:number}[]:undefined;
      const summary={total:result.grandTotal,accepted:result.counts.accepted,excluded:result.counts.excluded,metrics};
      const audit={sources:result.sourceAudit ?? [],recipe};
      const bytes = await exportXlsx(result.headers, result.rows, recipe.decimalPlaces,summary,'version' in recipe ? recipe.metrics.flatMap((m:{operation:string},i:number)=>m.operation==='count'?[]:[recipe.groups.length+i]):[1],audit);
      const restored = await readXlsx(bytes, '出力検証', 'Result');
      if (JSON.stringify(restored.headers) !== JSON.stringify(result.headers) || JSON.stringify(restored.rows) !== JSON.stringify(result.rows)) throw new Error('出力の再読取りが一致しません');
      const totals=await readXlsx(bytes,'合計検証','Summary');
      const expected=[...(metrics?metrics.map(m=>['全体：'+m.label,m.value]):[['全体合計',summary.total]]),['採用行数',summary.accepted],['除外行数',summary.excluded]];
      if(JSON.stringify(totals.rows)!==JSON.stringify(expected))throw new Error('全体集計の再読取りが一致しません');
      for(const table of auditTables(audit)){
        const restoredAudit=await readXlsx(bytes,'記録検証',table.name);
        if(JSON.stringify(restoredAudit.headers)!==JSON.stringify(table.headers)||JSON.stringify(restoredAudit.rows)!==JSON.stringify(table.rows))throw new Error('入力・条件記録の再読取りが一致しません');
      }
      self.postMessage({ value: { result, comparison: data.reference ? compare(result, data.reference) : null, bytes } });
    }
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : '処理を停止しました' }); }
};
