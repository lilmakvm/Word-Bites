import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './theme.css';

class AppErrorBoundary extends Component<{children:ReactNode},{hasError:boolean}> {
  state={hasError:false};
  static getDerivedStateFromError(){return {hasError:true};}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Word Bites runtime error',error,info);}
  render(){
    if(this.state.hasError){
      return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'system-ui',background:'#f4ead9',color:'#342c23',textAlign:'center'}}>
        <div><div style={{fontSize:56}}>🍪</div><h1>Word Bites recovered from an error</h1><p>The game hit an unexpected problem instead of leaving you on a blank screen.</p><button style={{padding:'12px 18px',border:0,borderRadius:12,background:'#4a443c',color:'#fff',fontWeight:800}} onClick={()=>window.location.reload()}>Reload Word Bites</button></div>
      </div>;
    }
    return this.props.children;
  }
}

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Word Bites offline support could not be registered', error);
    });
  });
}

const root=document.getElementById('root');
if(root){
  createRoot(root).render(
    <StrictMode>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </StrictMode>
  );
}
