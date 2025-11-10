import { IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Redirect } from 'react-router-dom'
import StartingPage from './pages/StartingPage'
import HomePage from './pages/HomePage'
import CanvasPage from './pages/CanvasPage'

function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonMenu side="start" type="overlay" contentId="main" menuId="canvas-tools-menu" style={{ zIndex: 2147483647 }}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Canvas Tools</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>Doodle</IonItem>
              <IonItem>Eraser</IonItem>
            </IonList>
          </IonContent>
        </IonMenu>

        <IonMenu side="end" type="overlay" contentId="main" menuId="days-sidebar-menu" style={{ zIndex: 2147483647 }}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Days</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>Day 1</IonItem>
              <IonItem>Day 2</IonItem>
            </IonList>
          </IonContent>
        </IonMenu>

        <IonRouterOutlet id="main">
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