import axios from 'axios';

/**
 * Los packing lists viven en otro backend, no en el de transportes, y su
 * resumen por orden es **público**: por eso esta instancia no lleva el
 * interceptor que inyecta el `AUTH_TOKEN`. Mandar el Bearer de una API a otra
 * no autoriza nada y filtra la sesión fuera de su dominio.
 */
const packingListApi = axios.create({
    baseURL: import.meta.env.VITE_PACKING_LIST_BASE_URL,
});

export default packingListApi;
