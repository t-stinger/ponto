import { defineConfig } from 'vite';
import { aiHandler,settings } from './src/server/ai.ts';
export default defineConfig({optimizeDeps:{include:['exceljs','fflate','papaparse','zod','decimal.js']},plugins:[{name:'ponto-local-ai',configureServer(server){const handle=aiHandler(settings(process.env));server.middlewares.use((req,res,next)=>{void handle(req,res,next);});}}]});
