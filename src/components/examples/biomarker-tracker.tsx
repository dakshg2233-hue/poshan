"use client";

import { useBiomarkers } from "@/lib/hooks/use-biomarkers";
import { useProfile } from "@/lib/hooks/use-profile";
import { useConditions } from "@/lib/hooks/use-conditions";

export function BiomarkerTracker() {
  const { biomarkers, loading, addBiomarker } = useBiomarkers();
  const { profile, updateProfile } = useProfile();
  const { conditions, addCondition, removeCondition } = useConditions();

  const handleAddBiomarker = async () => {
    // Example: Add a glucose reading
    await addBiomarker("glucose", 120, "mg/dL");
  };

  const handleUpdateProfile = async () => {
    // Example: Update weight
    await updateProfile({ weight_kg: 75 });
  };

  const handleAddCondition = async () => {
    // Example: Add diabetes condition
    await addCondition("diabetes");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <section>
        <h2 className="text-xl font-bold">Your Profile</h2>
        {profile && (
          <div className="mt-4 space-y-2">
            <p>
              <strong>Name:</strong> {profile.full_name}
            </p>
            <p>
              <strong>Height:</strong> {profile.height_cm} cm
            </p>
            <p>
              <strong>Weight:</strong> {profile.weight_kg} kg
            </p>
            <button
              onClick={handleUpdateProfile}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Update Profile
            </button>
          </div>
        )}
      </section>

      {/* Conditions Section */}
      <section>
        <h2 className="text-xl font-bold">Health Conditions</h2>
        <div className="mt-4 space-y-2">
          {conditions.map((condition) => (
            <div
              key={condition.id}
              className="flex justify-between items-center p-2 bg-gray-100 rounded"
            >
              <span>{condition.condition}</span>
              <button
                onClick={() => removeCondition(condition.id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={handleAddCondition}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded"
          >
            Add Condition
          </button>
        </div>
      </section>

      {/* Biomarkers Section */}
      <section>
        <h2 className="text-xl font-bold">Biomarkers</h2>
        <div className="mt-4 space-y-2">
          {biomarkers.map((biomarker) => (
            <div key={biomarker.id} className="p-2 bg-gray-100 rounded">
              <p>
                <strong>{biomarker.marker}</strong>: {biomarker.value}{" "}
                {biomarker.unit}
              </p>
              <small className="text-gray-500">
                Taken on {new Date(biomarker.taken_on).toLocaleDateString()}
              </small>
            </div>
          ))}
          <button
            onClick={handleAddBiomarker}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded"
          >
            Add Biomarker
          </button>
        </div>
      </section>
    </div>
  );
}
