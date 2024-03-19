import BountyList from "@/components/ui/BountyList";
import ToggleButton from "@/components/ui/ToggleButton";

const Content = () => {
  return (
    <div className="pb-44">
      <ToggleButton option1={"Open to Claim"} option2={"Past Bounty"}/>
      
      <BountyList />
    </div>
  );
};

export default Content;