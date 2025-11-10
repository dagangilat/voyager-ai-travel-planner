import Dashboard from './pages/Dashboard';
import CreateTrip from './pages/CreateTrip';
import TripDetails from './pages/TripDetails';
import SearchTransportation from './pages/SearchTransportation';
import SearchLodging from './pages/SearchLodging';
import EditTrip from './pages/EditTrip';
import SearchExperiences from './pages/SearchExperiences';
import AdminSettings from './pages/AdminSettings';
import Profile from './pages/Profile';
import Terms from './pages/Terms';
import Help from './pages/Help';
import Login from './pages/Login';
import Layout from './Layout.jsx';


export const PAGES = {
    "Login": Login,
    "Dashboard": Dashboard,
    "CreateTrip": CreateTrip,
    "TripDetails": TripDetails,
    "SearchTransportation": SearchTransportation,
    "SearchLodging": SearchLodging,
    "EditTrip": EditTrip,
    "SearchExperiences": SearchExperiences,
    "AdminSettings": AdminSettings,
    "Profile": Profile,
    "Terms": Terms,
    "Help": Help,
}

export const pagesConfig = {
    mainPage: "Login",
    Pages: PAGES,
    Layout: Layout,
};