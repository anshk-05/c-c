import Dashboard from './pages/Dashboard';
import ClientNode from './pages/ClientNode';

function App() {
  const route = window.location.hash.replace(/^#/, '') || window.location.pathname;

  if (route.startsWith('/client')) {
    return <ClientNode />;
  }

  return <Dashboard />;
}

export default App;
