import BackTemplate from "../../../../components/templates/back/back";

function Rating() {

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

    </BackTemplate>
  );
}

export default Rating;