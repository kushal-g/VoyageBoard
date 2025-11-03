import { IonIcon } from '@ionic/react'
import { cellular, wifi, batteryHalf } from 'ionicons/icons'
import { useEffect, useState } from 'react'

const AppStatusBar = () => {
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    const updateTimeAndDate = () => {
      const now = new Date()
      // Format time as "9:41" (12-hour format without AM/PM)
      const hours = now.getHours() % 12 || 12
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const time = `${hours}:${minutes}`
      
      // Format date as "Mon Nov 3"
      const date = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

      setCurrentTime(time)
      setCurrentDate(date)
    }

    updateTimeAndDate()
    const interval = setInterval(updateTimeAndDate, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="status-bar">
      <div className="status-left">
        <IonIcon icon={cellular} />
        <IonIcon icon={wifi} />
        <span>100%</span>
        <IonIcon icon={batteryHalf} />
      </div>
      <div className="status-right">
        <span>{currentTime}</span>
        <span>{currentDate}</span>
      </div>
    </div>
  )
}

export default AppStatusBar

