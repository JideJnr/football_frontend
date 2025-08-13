import BackTemplate from "../../../../components/templates/back/back";

function Suggestions() {

  const refresh = (e: CustomEvent) => {
    try {
      
      e.detail.complete();
    } catch (err) {
      console.error("Refresh error:", err);
      e.detail.complete();
    }
  };

  return (
    <BackTemplate refresh={refresh}>

      // sort by country surest..

    </BackTemplate>
  );
}

export default Suggestions;