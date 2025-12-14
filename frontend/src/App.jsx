import { ToastProvider } from './components/ui/Toast';
import TripPlannerForm from './components/TripPlannerForm';

function App() {
  const handleSubmit = async (formData) => {
    console.log('Trip Plan Data:', formData);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // You can send this data to your backend here
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f5f5f5] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#208896]">SerendibTrip</h1>
            <p className="text-gray-600 mt-2">Your Sri Lanka Travel Planner</p>
          </div>
          <TripPlannerForm onSubmit={handleSubmit} />
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
