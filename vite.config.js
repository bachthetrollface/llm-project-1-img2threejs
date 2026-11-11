import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        grater: 'index.html',
        table: 'table.html',
        tomato: 'tomato.html',
        tomatoDirect: 'tomato-direct.html',
        woodenTableDirect: 'wooden-table-direct.html',
        graterDirect: 'grater-direct.html',
        lifebuoy: 'lifebuoy.html',
        blueCan: 'blue-can.html',
      },
    },
  },
});
