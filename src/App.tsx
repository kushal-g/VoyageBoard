import { IonApp, IonRouterOutlet } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Redirect } from 'react-router-dom'
import StartingPage from './pages/StartingPage'
import HomePage from './pages/HomePage'
import CanvasPage from './pages/CanvasPage'

function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route path="/starting" component={StartingPage} exact />
          <Route path="/home" component={HomePage} exact />
          <Route path="/canvas/:id" component={CanvasPage} exact />
          <Redirect exact from="/" to="/starting" />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  )
}

export default App
