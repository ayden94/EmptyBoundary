import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { after } from 'node:test';

GlobalRegistrator.register({ url: 'http://localhost' });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

after(async () => {
  await GlobalRegistrator.unregister();
});
