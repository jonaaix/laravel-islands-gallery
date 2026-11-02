import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

const params = new URLSearchParams(window.location.search);
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

document.documentElement.classList.toggle('dark', params.has('dark') || (prefersDark && !params.has('light')));

createApp(App).mount('#app');
