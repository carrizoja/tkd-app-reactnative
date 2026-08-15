import { render } from "@testing-library/react-native";
import { Text, View } from "react-native";

// A minimal component render to confirm React Native Testing Library is wired
// up. Full navigation/screen tests come with the capability task groups.
function Sample() {
  return (
    <View>
      <Text>TKD Admin</Text>
    </View>
  );
}

describe("React Native Testing Library", () => {
  it("renders a component", async () => {
    const { getByText } = await render(<Sample />);
    expect(getByText("TKD Admin")).toBeTruthy();
  });
});
