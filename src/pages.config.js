import Dashboard from './pages/Dashboard';
import CreateTrip from './pages/CreateTrip';
import TripDetails from './pages/TripDetails';
import SearchTransportation from './pages/SearchTransportation';
import SearchLodging from './pages/SearchLodging';
import EditTrip from './pages/EditTrip';
import SearchExperiences from './pages/SearchExperiences';
import AdminSettings from './pages/AdminSettings';
import ProUpgrade from './pages/ProUpgrade';
import Profile from './pages/Profile';
import Payment from './pages/Payment';
import Billing from './pages/Billing';
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
    "ProUpgrade": ProUpgrade,
    "Profile": Profile,
    "Payment": Payment,
    "Billing": Billing,
}

export const pagesConfig = {
    mainPage: "Login",
    Pages: PAGES,
    Layout: Layout,
};